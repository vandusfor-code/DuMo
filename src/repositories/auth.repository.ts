import "server-only";
import type {
  AuthRole,
  AuthUser,
  ChangePasswordInput,
  CreateUserInput,
  UpdateProfileInput,
  UpdateUserInput,
} from "@/types/auth";
import { AUTH_ROLE_LABELS } from "@/types/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { SEED_ADMIN, seedAdminPasswordHash } from "@/lib/auth/seed-admin";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import { getSql, withDbRetry, withQueryTimeout } from "@/server/db/client";

export interface AuthRepository {
  ensureSeedAdmin(): Promise<void>;
  authenticate(login: string, password: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
  listUsers(): Promise<AuthUser[]>;
  listByRole(role: AuthRole): Promise<AuthUser[]>;
  createUser(input: CreateUserInput): Promise<AuthUser>;
  updateUser(id: string, input: UpdateUserInput): Promise<AuthUser>;
  deleteUser(id: string): Promise<void>;
  setActive(id: string, active: boolean): Promise<AuthUser>;
  changePassword(id: string, newPassword: string): Promise<void>;
  changePasswordWithCurrent(id: string, input: ChangePasswordInput): Promise<void>;
  updateProfile(id: string, input: UpdateProfileInput): Promise<AuthUser>;
  touchLastSeen(id: string): Promise<void>;
  setAdvisorSalesGoal(id: string, monthlySalesGoal: number | null): Promise<AuthUser>;
}

function mapRow(r: {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  avatar_url: string;
  company_id?: string | null;
  monthly_sales_goal?: number | null;
  token_version?: number | null;
  presence_status?: string | null;
}): AuthUser {
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    name: r.name,
    role: r.role as AuthRole,
    active: r.active,
    avatarUrl: r.avatar_url ?? "",
    companyId: r.company_id ?? DEFAULT_COMPANY_ID,
    monthlySalesGoal:
      r.monthly_sales_goal != null && r.monthly_sales_goal > 0
        ? Number(r.monthly_sales_goal)
        : null,
    tokenVersion: Number(r.token_version ?? 0) || 0,
    presenceStatus: r.presence_status ?? null,
  };
}

function requireSql() {
  const sql = getSql();
  if (!sql) {
    throw new Error("DATABASE_URL no configurada. La autenticación requiere Postgres.");
  }
  return sql;
}

const touchCache = new Map<string, number>();

class PostgresAuthRepository implements AuthRepository {
  async ensureSeedAdmin(): Promise<void> {
    try {
      const sql = requireSql();
      const existing = await sql`
        SELECT id FROM users WHERE email = ${SEED_ADMIN.email} LIMIT 1
      `;
      if (existing.length > 0) return;

      await sql`
        INSERT INTO users (id, username, email, password_hash, name, role, active, avatar_url, company_id)
        VALUES (
          ${SEED_ADMIN.id},
          ${SEED_ADMIN.username},
          ${SEED_ADMIN.email},
          ${seedAdminPasswordHash()},
          ${SEED_ADMIN.name},
          ${SEED_ADMIN.role},
          true,
          ${SEED_ADMIN.avatarUrl},
          ${DEFAULT_COMPANY_ID}
        )
        ON CONFLICT (email) DO NOTHING
      `;
    } catch (err) {
      console.error("[ensureSeedAdmin]", err);
    }
  }

  /** Solo lectura — sin migraciones ni DDL en el camino crítico del login. */
  async authenticate(login: string, password: string): Promise<AuthUser | null> {
    const sql = requireSql();
    const q = login.trim().toLowerCase();
    const rows = await withQueryTimeout(
      sql`
        SELECT id, username, email, password_hash, name, role, active, avatar_url, company_id, token_version
        FROM users
        WHERE active = true
          AND (lower(email) = ${q} OR lower(username) = ${q})
        LIMIT 1
      `,
      5_000,
    );
    const row = rows[0] as
      | {
          id: string;
          username: string;
          email: string;
          password_hash: string;
          name: string;
          role: string;
          active: boolean;
          avatar_url: string;
          company_id?: string | null;
          token_version?: number | null;
        }
      | undefined;
    if (!row || !verifyPassword(password, row.password_hash)) return null;

    try {
      // Antes esto volteaba presence_status de 'desconectado' a 'disponible'
      // en cada login — toda asesora quedaba "conectada" automáticamente al
      // entrar, saltándose el requisito de que ellas mismas se marquen
      // disponibles a mano. Ahora el login SOLO actualiza last_seen_at; el
      // estado operativo nunca cambia sin que la asesora lo elija.
      await sql`UPDATE users SET last_seen_at = now() WHERE id = ${row.id}`;
    } catch (err) {
      // No bloquear login si la migración de presencia aún no corrió en prod.
      console.error("[authenticate] presence touch failed", err);
    }

    const refreshed = await sql`
      SELECT id, username, email, name, role, active, avatar_url, company_id, token_version, presence_status
      FROM users WHERE id = ${row.id} LIMIT 1
    `;
    const userRow = refreshed[0];
    if (!userRow) return null;
    return mapRow(userRow as Parameters<typeof mapRow>[0]);
  }

  async findById(id: string): Promise<AuthUser | null> {
    const sql = requireSql();
    const rows = await withQueryTimeout(
      sql`
        SELECT id, username, email, name, role, active, avatar_url, company_id, monthly_sales_goal, token_version, presence_status
        FROM users WHERE id = ${id} LIMIT 1
      `,
      5_000,
    );
    const row = rows[0];
    if (!row) return null;
    return mapRow(row as Parameters<typeof mapRow>[0]);
  }

  async listUsers(): Promise<AuthUser[]> {
    const sql = requireSql();
    const rows = await withDbRetry(() => sql`
      SELECT id, username, email, name, role, active, avatar_url, company_id, monthly_sales_goal, token_version, presence_status
      FROM users
      ORDER BY name ASC
    `);
    return rows.map((r) => mapRow(r as Parameters<typeof mapRow>[0]));
  }

  async listByRole(role: AuthRole): Promise<AuthUser[]> {
    const users = await this.listUsers();
    return users.filter((u) => u.role === role);
  }

  private async assertUnique(email: string, username: string, excludeId?: string) {
    const sql = requireSql();
    const emailQ = email.toLowerCase();
    const userQ = username.toLowerCase();

    const emailRows = excludeId
      ? await sql`SELECT id FROM users WHERE lower(email) = ${emailQ} AND id <> ${excludeId} LIMIT 1`
      : await sql`SELECT id FROM users WHERE lower(email) = ${emailQ} LIMIT 1`;
    if (emailRows.length > 0) throw new Error("El correo ya está registrado.");

    const userRows = excludeId
      ? await sql`SELECT id FROM users WHERE lower(username) = ${userQ} AND id <> ${excludeId} LIMIT 1`
      : await sql`SELECT id FROM users WHERE lower(username) = ${userQ} LIMIT 1`;
    if (userRows.length > 0) throw new Error("El nombre de usuario ya existe.");
  }

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const sql = requireSql();
    await this.assertUnique(input.email, input.username);

    const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await sql`
      INSERT INTO users (id, username, email, password_hash, name, role, active, avatar_url, company_id, presence_status)
      VALUES (
        ${id},
        ${input.username.trim()},
        ${input.email.trim()},
        ${hashPassword(input.password)},
        ${input.name.trim()},
        ${input.role},
        ${input.active ?? true},
        '',
        ${DEFAULT_COMPANY_ID},
        'desconectado'
      )
    `;
    const user = await this.findById(id);
    if (!user) throw new Error("No se pudo crear el usuario.");
    return user;
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<AuthUser> {
    await this.assertUnique(input.email, input.username, id);
    const sql = requireSql();
    await sql`
      UPDATE users SET
        username = ${input.username.trim()},
        email = ${input.email.trim()},
        name = ${input.name.trim()},
        role = ${input.role},
        active = ${input.active}
      WHERE id = ${id}
    `;
    const user = await this.findById(id);
    if (!user) throw new Error("Usuario no encontrado.");
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const sql = requireSql();
    const admins = await sql`
      SELECT id FROM users WHERE role = 'administrador' AND active = true
    `;
    if (admins.length <= 1) {
      const target = await this.findById(id);
      if (target?.role === "administrador") {
        throw new Error("No puedes eliminar el único administrador activo.");
      }
    }
    await sql`DELETE FROM users WHERE id = ${id}`;
  }

  async setActive(id: string, active: boolean): Promise<AuthUser> {
    const sql = requireSql();
    if (!active) {
      const user = await this.findById(id);
      if (user?.role === "administrador") {
        const admins = await sql`
          SELECT id FROM users WHERE role = 'administrador' AND active = true AND id <> ${id}
        `;
        if (admins.length === 0) {
          throw new Error("Debe existir al menos un administrador activo.");
        }
      }
    }
    await sql`UPDATE users SET active = ${active} WHERE id = ${id}`;
    const updated = await this.findById(id);
    if (!updated) throw new Error("Usuario no encontrado.");
    return updated;
  }

  async changePassword(id: string, newPassword: string): Promise<void> {
    const sql = requireSql();
    await sql`
      UPDATE users SET password_hash = ${hashPassword(newPassword)} WHERE id = ${id}
    `;
  }

  async changePasswordWithCurrent(id: string, input: ChangePasswordInput): Promise<void> {
    const sql = requireSql();
    const rows = await sql`
      SELECT password_hash FROM users WHERE id = ${id} LIMIT 1
    `;
    const row = rows[0] as { password_hash: string } | undefined;
    if (!row || !verifyPassword(input.currentPassword, row.password_hash)) {
      throw new Error("La contraseña actual no es correcta.");
    }
    await this.changePassword(id, input.newPassword);
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<AuthUser> {
    await this.assertUnique(input.email, input.username, id);
    const sql = requireSql();
    await sql`
      UPDATE users SET
        name = ${input.name.trim()},
        email = ${input.email.trim()},
        username = ${input.username.trim()}
      WHERE id = ${id}
    `;
    const user = await this.findById(id);
    if (!user) throw new Error("Usuario no encontrado.");
    return user;
  }

  async touchLastSeen(id: string): Promise<void> {
    const now = Date.now();
    const last = touchCache.get(id) ?? 0;
    if (now - last < 60_000) return;
    touchCache.set(id, now);
    try {
      const sql = requireSql();
      await withDbRetry(() => sql`UPDATE users SET last_seen_at = now() WHERE id = ${id}`);
    } catch {
      /* no bloquear la sesión si falla */
    }
  }

  async setAdvisorSalesGoal(id: string, monthlySalesGoal: number | null): Promise<AuthUser> {
    const sql = requireSql();
    const user = await this.findById(id);
    if (!user || user.role !== "asesora") {
      throw new Error("Solo se puede asignar meta a usuarios con rol Asesora.");
    }
    const value =
      monthlySalesGoal != null && monthlySalesGoal > 0 ? Math.round(monthlySalesGoal) : null;
    await sql`UPDATE users SET monthly_sales_goal = ${value} WHERE id = ${id}`;
    const updated = await this.findById(id);
    if (!updated) throw new Error("Usuario no encontrado.");
    return updated;
  }
}

export function getAuthRepository(): AuthRepository {
  return new PostgresAuthRepository();
}

export function redirectForRole(role: AuthRole): "/admin" | "/dashboard" {
  return role === "asesora" ? "/dashboard" : "/admin";
}

export function authUserToPublicUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: AUTH_ROLE_LABELS[user.role],
    roleKey: user.role,
    avatarUrl: user.avatarUrl,
    active: user.active,
    presenceStatus: user.presenceStatus ?? null,
  };
}
