import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrowserClient } from "@/lib/supabase";
import { cn } from "@/utils/cn";
import { APP_ROUTES } from "@/utils/routes";

export function LogoutButton({ className, forceLabel = false }) {
  const navigate = useNavigate();

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    navigate(APP_ROUTES.login, { replace: true });
  }

  return (
    <Button variant="logout" className={cn("ml-1", className)} onClick={handleLogout}>
      <LogOut size={16} strokeWidth={1.6} />
      <span className={forceLabel ? "" : "hidden sm:inline"}>Cerrar sesión</span>
    </Button>
  );
}
