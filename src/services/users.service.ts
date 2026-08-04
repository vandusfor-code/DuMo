import "server-only";
import { getUsersRepository } from "@/repositories/users.repository";
import type { User } from "@/types/user";

export const usersService = {
  getCurrentUser(): Promise<User> {
    return getUsersRepository().getCurrentUser();
  },
  list(): Promise<User[]> {
    return getUsersRepository().listUsers();
  },
};
