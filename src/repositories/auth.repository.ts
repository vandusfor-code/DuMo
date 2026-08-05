import "server-only";
import type { AuthRole, AuthUser } from "@/types/auth";
import { verifyPassword } from "@/lib/auth/password";
import { SEED_ADMIN, seedAdminPasswordHash } from "@/lib/auth/seed-admin";
import { ensureSchema, getSql } from "@/server/db/client";
import { withLatency } from "@/lib/mock";

export interface AuthRepository {
  ensureSeedAdmin(): Promise<void>;
  authenticate(login: string, password: string): Promise<AuthUser | null>;
  findById(id: string): Promise<AuthUser | null>;
}

function mapRow(r: {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  avatar_url: string;
}): AuthUser {
  return {
    id: r.id,
    username: r.username,
    email: r.email,
    name: r.name,
    role: r.role as AuthRole,
    active: r.active,
    avatarUrl: r.avatar_url,
  };
}

const MOCK_USER: AuthUser & { passwordHash: string } = {
  id: SEED_ADMIN.id,
  username: SEED_ADMIN.username,
  email: SEED_ADMIN.email,
  name: SEED_ADMIN.name,
  role: SEED_ADMIN.role,
  active: true,
  avatarUrl: SEED_ADMIN.avatarUrl,
  passwordHash: seedAdminPasswordHash(),
};

class MockAuthRepository implements AuthRepository {
  private users = [MOCK_USER];

  ensureSeedAdmin() {
    return Promise.resolve();
  }

  authenticate(login: string, password: string) {
    const q = login.trim().toLowerCase();
    const user = this.users.find(
      (u) =>
        u.active &&
        (u.email.toLowerCase() === q || u.username.toLowerCase() === q),
    );
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return withLatency(null);
    }
    const { passwordHash: _, ...safe } = user;
    return withLatency(safe);
  }

  findById(id: string) {
    const user = this.users.find((u) => u.id === id);
    if (!user) return withLatency(null);
    const { passwordHash: _, ...safe } = user;
    return withLatency(safe);
  }
}

class PostgresAuthRepository implements AuthRepository {
  async ensureSeedAdmin(): Promise<void> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return;

    const existing = await sql`
      SELECT id FROM users WHERE email = ${SEED_ADMIN.email} LIMIT 1
    `;
    if (existing.length > 0) return;

    await sql`
      INSERT INTO users (id, username, email, password_hash, name, role, active, avatar_url)
      VALUES (
        ${SEED_ADMIN.id},
        ${SEED_ADMIN.username},
        ${SEED_ADMIN.email},
        ${seedAdminPasswordHash()},
        ${SEED_ADMIN.name},
        ${SEED_ADMIN.role},
        true,
        ${SEED_ADMIN.avatarUrl}
      )
    `;
  }

  async authenticate(login: string, password: string): Promise<AuthUser | null> {
    await this.ensureSeedAdmin();
    const sql = getSql();
    if (!sql) return null;

    const q = login.trim().toLowerCase();
    const rows = await sql`
      SELECT id, username, email, password_hash, name, role, active, avatar_url
      FROM users
      WHERE active = true
        AND (lower(email) = ${q} OR lower(username) = ${q})
      LIMIT 1
    `;
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
        }
      | undefined;
    if (!row || !verifyPassword(password, row.password_hash)) return null;
    return mapRow(row);
  }

  async findById(id: string): Promise<AuthUser | null> {
    await this.ensureSeedAdmin();
    const sql = getSql();
    if (!sql) return null;

    const rows = await sql`
      SELECT id, username, email, name, role, active, avatar_url
      FROM users WHERE id = ${id} LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return mapRow(row as Parameters<typeof mapRow>[0]);
  }
}

export function getAuthRepository(): AuthRepository {
  if (getSql()) return new PostgresAuthRepository();
  return new MockAuthRepository();
}

/** Rol → ruta de inicio tras login. */
export function redirectForRole(role: AuthRole): "/admin" | "/dashboard" {
  return role === "asesora" ? "/dashboard" : "/admin";
}

export function authUserToPublicUser(user: AuthUser) {
  const roleLabels: Record<AuthRole, string> = {
    administrador: "Administrador",
    supervisor: "Supervisor",
    asesora: "Asesora Comercial",
    sistema: "Sistema",
  };
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: roleLabels[user.role],
    avatarUrl: user.avatarUrl,
  };
}
