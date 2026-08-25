export const emailjsConfig = {
  serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID ?? "",
  publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY ?? "",
  templates: {
    invitacion: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_INVITACION ?? "",
    recuperar: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_RECUPERAR ?? "",
  },
} as const;

export function isEmailJsConfigured() {
  return Boolean(
    emailjsConfig.serviceId &&
      emailjsConfig.publicKey &&
      emailjsConfig.templates.invitacion &&
      emailjsConfig.templates.recuperar,
  );
}
