import "server-only";
import { authService } from "@/services/auth.service";
import { getUsersRepository } from "@/repositories/users.repository";
import type { User } from "@/types/user";

export const usersService = {
  async getCurrentUser(): Promise<User | null> {
    const sessionUser = await authService.getCurrentPublicUser();
    if (sessionUser) return sessionUser;
    return null;
  },

  list(): Promise<User[]> {
    return getUsersRepository().listUsers();
  },
};
