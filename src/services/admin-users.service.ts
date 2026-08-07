import "server-only";
import { getAuthRepository } from "@/repositories/auth.repository";
import { getAdminSalesRepository } from "@/repositories/admin-sales.repository";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import type { AdvisorsResult } from "@/types/admin-advisor";

export const adminUsersService = {
  list() {
    return getAuthRepository().listUsers();
  },
  create(input: Parameters<ReturnType<typeof getAuthRepository>["createUser"]>[0]) {
    return getAuthRepository().createUser(input);
  },
  update(id: string, input: Parameters<ReturnType<typeof getAuthRepository>["updateUser"]>[1]) {
    return getAuthRepository().updateUser(id, input);
  },
  delete(id: string) {
    return getAuthRepository().deleteUser(id);
  },
  setActive(id: string, active: boolean) {
    return getAuthRepository().setActive(id, active);
  },
  changePassword(id: string, newPassword: string) {
    return getAuthRepository().changePassword(id, newPassword);
  },
};

export const profileService = {
  getProfile(userId: string) {
    return getAuthRepository().findById(userId);
  },
  updateProfile(userId: string, input: Parameters<ReturnType<typeof getAuthRepository>["updateProfile"]>[1]) {
    return getAuthRepository().updateProfile(userId, input);
  },
  changePassword(userId: string, input: Parameters<ReturnType<typeof getAuthRepository>["changePasswordWithCurrent"]>[1]) {
    return getAuthRepository().changePasswordWithCurrent(userId, input);
  },
};

export const adminAdvisorsService = {
  async list(): Promise<AdvisorsResult> {
    const [advisors, salesResult, config] = await Promise.all([
      getAuthRepository().listByRole("asesora"),
      getAdminSalesRepository().list({
        search: "",
        status: "all",
        advisor: "all",
        type: "all",
        page: 1,
        pageSize: 10000,
      }),
      getCommercialConfigurationRepository().getSnapshot(),
    ]);

    const rows = advisors.map((a) => {
      const advisorSales = salesResult.rows.filter((s) => s.advisor === a.name);
      const finalized = advisorSales.filter((s) => s.status === "finalizada");
      const inDelivery = advisorSales.filter((s) => s.status === "en_reparto");
      const registered = advisorSales.length;
      const conversionRate = registered > 0 ? Math.round((finalized.length / registered) * 100) : 0;

      return {
        id: a.id,
        name: a.name,
        email: a.email,
        username: a.username,
        active: a.active,
        avatarUrl: a.avatarUrl,
        registeredSales: registered,
        finalizedSales: finalized.length,
        inDeliverySales: inDelivery.length,
        conversionRate,
        monthlySalesGoal: a.monthlySalesGoal ?? null,
      };
    });

    const active = rows.filter((r) => r.active).length;
    const totalSalesMonth = rows.reduce((s, r) => s + r.registeredSales, 0);
    const avgConversion =
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + r.conversionRate, 0) / rows.length)
        : 0;
    const assignedGoalsTotal = rows
      .filter((r) => r.active && r.monthlySalesGoal != null && r.monthlySalesGoal > 0)
      .reduce((s, r) => s + (r.monthlySalesGoal ?? 0), 0);

    return {
      summary: {
        total: rows.length,
        active,
        totalSalesMonth,
        avgConversion,
        teamMonthlyGoal: config.settings.monthlyGoal,
        assignedGoalsTotal,
      },
      rows,
    };
  },

  setSalesGoal(advisorId: string, monthlySalesGoal: number | null) {
    return getAuthRepository().setAdvisorSalesGoal(advisorId, monthlySalesGoal);
  },
};
