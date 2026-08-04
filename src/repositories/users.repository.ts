import "server-only";
import type { User } from "@/types/user";
import { USERS_MOCK } from "@/data/mock/users.mock";
import { withLatency } from "@/lib/mock";
import { getSheetsClient, type GoogleSheetsClient } from "@/server/google/sheets-client";

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

class SheetsUsersRepository implements UsersRepository {
  constructor(private readonly client: GoogleSheetsClient) {}

  async listUsers(): Promise<User[]> {
    const records = await this.client.getRecords("Usuarios");
    return records.map((r) => ({
      id: r.id,
      name: r.nombre,
      role: r.cargo,
      email: r.email,
      avatarUrl: r.avatarUrl,
    }));
  }

  async getCurrentUser(): Promise<User> {
    const users = await this.listUsers();
    // No auth yet: the first advisor is the "current" user. Falls back to the
    // default advisor when the Usuarios tab is still empty.
    return users[0] ?? USERS_MOCK[0];
  }
}

/** Picks the Sheets repo when credentials exist, otherwise the mock. */
export function getUsersRepository(): UsersRepository {
  const client = getSheetsClient();
  return client ? new SheetsUsersRepository(client) : new MockUsersRepository();
}
