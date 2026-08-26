function clean(value?: string) {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function isPlaceholder(value: string) {
  return !value || value.includes("xxxxxxxx") || value.includes("...");
}

export function getSupabaseEnv() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonRaw = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const publishableRaw = clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const anonKey = !isPlaceholder(anonRaw)
    ? anonRaw
    : !isPlaceholder(publishableRaw)
      ? publishableRaw
      : "";

  return {
    url,
    anonKey,
    serviceRoleKey,
    isConfigured: Boolean(url && anonKey && !isPlaceholder(url)),
  };
}
