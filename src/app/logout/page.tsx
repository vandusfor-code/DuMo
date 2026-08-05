import { redirect } from "next/navigation";

/** Cierra la sesión y redirige al login (auth real pendiente). */
export default function LogoutPage() {
  redirect("/login");
}
