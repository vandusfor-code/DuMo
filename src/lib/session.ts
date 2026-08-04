/**
 * Current advisor context. Hardcoded for now; when auth/Sheets is wired
 * this becomes a session lookup and everything downstream keeps working.
 */
export type CurrentUser = {
  name: string;
  role: string;
  avatarUrl: string;
};

export const CURRENT_USER: CurrentUser = {
  name: "María López",
  role: "Asesora Comercial",
  avatarUrl:
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=3&w=160&h=160&q=80",
};
