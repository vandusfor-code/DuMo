export type AuthRole = "administrador" | "supervisor" | "asesora" | "sistema";

export const AUTH_ROLE_LABELS: Record<AuthRole, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  asesora: "Asesora",
  sistema: "Sistema",
};

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: AuthRole;
  active: boolean;
  avatarUrl: string;
  companyId: string;
  /** Meta de ventas del mes asignada por el admin (null = reparto automático del equipo). */
  monthlySalesGoal?: number | null;
  /** Contador de revocación de sesión — incrementa al forzar desconexión. */
  tokenVersion?: number;
}

export interface LoginResult {
  user: AuthUser;
  redirectTo: "/admin" | "/dashboard";
}

export interface CreateUserInput {
  name: string;
  username: string;
  email: string;
  role: AuthRole;
  password: string;
  active?: boolean;
}

export interface UpdateUserInput {
  name: string;
  username: string;
  email: string;
  role: AuthRole;
  active: boolean;
}

export interface UpdateProfileInput {
  name: string;
  email: string;
  username: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AdminChangePasswordInput {
  newPassword: string;
}
