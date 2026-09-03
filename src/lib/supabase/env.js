function clean(value) {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function isPlaceholder(value) {
  return !value || value.includes("xxxxxxxx") || value.includes("...");
}

function readEnv(name) {
  return clean(import.meta.env[name]);
}

export function getSupabaseEnv() {
  const url =
    readEnv("NEXT_PUBLIC_SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  const anonRaw =
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || readEnv("VITE_SUPABASE_ANON_KEY");
  const publishableRaw =
    readEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    readEnv("VITE_SUPABASE_PUBLISHABLE_KEY");

  const anonKey = !isPlaceholder(anonRaw)
    ? anonRaw
    : !isPlaceholder(publishableRaw)
      ? publishableRaw
      : "";

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && !isPlaceholder(url)),
  };
}
