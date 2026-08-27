import { type ReactNode } from "react";
import NavBar from "@/components/NavBar";
import { getSession } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <>
      <NavBar role={session?.role ?? "admin"} />
      {children}
    </>
  );
}
