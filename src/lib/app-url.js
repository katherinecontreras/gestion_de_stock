import { APP_ROUTES } from "@/utils/routes";

const PRODUCCION_VERCEL = "https://gestion-de-stock.vercel.app";

function clean(value) {
  return String(value ?? "")
    .trim()
    .replace(/\/$/, "");
}

/** Origen público de la app. Los mails siempre van a Vercel, nunca a localhost. */
export function getAppPublicUrl() {
  const fromEnv = clean(
    import.meta.env.APP_PUBLIC_URL ||
      import.meta.env.NEXT_PUBLIC_APP_URL ||
      import.meta.env.VITE_APP_URL,
  );
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) {
    return fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
  }
  return PRODUCCION_VERCEL;
}

export function appPublicHref(path, searchParams) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${getAppPublicUrl()}${suffix}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export function buildRecuperarLink({ token, dni }) {
  return appPublicHref(APP_ROUTES.recuperar, { token, dni });
}
