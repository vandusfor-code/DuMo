import "server-only";
import type { User } from "@/types/user";
import { USERS_MOCK } from "@/data/mock/users.mock";
import { withLatency } from "@/lib/mock";
import { getAuthRepository } from "@/repositories/auth.repository";
import { hasDatabase } from "@/server/db/client";

export interface UsersRepository {
  listUsers(): Promise<User[]>;
  getCurrentUser(): Promise<User>;
}

class MockUsersRepository implements UsersRepository {
  listUsers() {
    return withLatency(USERS_MOCK);
  }
  getCurrentUser() {
    return withLatency(USERS_MOCK[0]);
  }
}

class PostgresUsersRepository implements UsersRepository {
  listUsers() {
    return getAuthRepository().listUsers();
  }
  async getCurrentUser() {
    const users = await getAuthRepository().listUsers();
    return users[0] ?? USERS_MOCK[0];
  }
}

/** Usa Postgres (auth) cuando hay DATABASE_URL; evita Google Sheets. */
export function getUsersRepository(): UsersRepository {
  if (hasDatabase()) return new PostgresUsersRepository();
  return new MockUsersRepository();
}
