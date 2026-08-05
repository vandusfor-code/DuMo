import { hashPassword } from "./password";

/** Usuario administrador inicial solicitado por el cliente. */
export const SEED_ADMIN = {
  id: "usr-duvan-admin",
  username: "duvan.ramos",
  email: "ventaswom@dulabs.co",
  password: "100299",
  name: "Duvan Ramos",
  role: "administrador" as const,
  avatarUrl: "",
};

export function seedAdminPasswordHash(): string {
  return hashPassword(SEED_ADMIN.password);
}
