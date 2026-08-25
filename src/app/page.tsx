import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { APP_ROUTES } from "@/utils/routes";

export default async function HomePage() {
  const { isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    redirect(APP_ROUTES.login);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? APP_ROUTES.articulos : APP_ROUTES.login);
}
