"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@/lib/supabase";
import { APP_ROUTES } from "@/utils/routes";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push(APP_ROUTES.login);
    router.refresh();
  }

  return (
    <Button variant="logout" className="ml-1" onClick={handleLogout}>
      <LogOut size={16} strokeWidth={1.6} />
      <span className="hidden sm:inline">Cerrar sesión</span>
    </Button>
  );
}
