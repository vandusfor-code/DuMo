/** Filtro de datos por asesora conectada (null = ver todo, p. ej. admin). */
export type AdvisorScope = {
  id: string;
  name: string;
};

export function advisorScopeFromUser(user: {
  id: string;
  name: string;
  role: string;
} | null): AdvisorScope | null {
  if (!user) return null;
  if (user.role === "asesora") return { id: user.id, name: user.name };
  return null;
}

export function matchesAdvisor(
  row: { advisor_id?: string | null; advisor_name?: string | null },
  scope: AdvisorScope | null,
): boolean {
  if (!scope) return true;
  if (row.advisor_id && row.advisor_id === scope.id) return true;
  if (row.advisor_name && row.advisor_name === scope.name) return true;
  return false;
}
