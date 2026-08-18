import { redirect } from "next/navigation";

export default function Home() {
  // Punto de entrada del MVP: el flujo de acceso. La autenticación real llega
  // con Supabase; por ahora el login está simulado.
  redirect("/login");
}
