import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth/constants";

/** Cierra la sesión y redirige al login. */
export default async function LogoutPage() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
