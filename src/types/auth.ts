export type AuthRole = "administrador" | "supervisor" | "asesora" | "sistema";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: AuthRole;
  active: boolean;
  avatarUrl: string;
}

export interface LoginResult {
  user: AuthUser;
  redirectTo: "/admin" | "/dashboard";
}
