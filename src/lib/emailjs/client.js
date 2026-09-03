import emailjs from "@emailjs/browser";

function readEnv(name) {
    return String(import.meta.env[name] ?? "").trim();
}

export const emailjsConfig = {
    serviceId: readEnv("EMAILJS_SERVICE_ID"),
    publicKey: readEnv("EMAILJS_PUBLIC_KEY"),
    templates: {
        codigo: readEnv("EMAILJS_TEMPLATE_CODIGO"),
        recuperar: readEnv("EMAILJS_TEMPLATE_RECUPERAR"),
    },
};

function missingEmailJsVars(keys) {
    return keys.filter((key) => {
        if (key === "EMAILJS_TEMPLATE_CODIGO") return !emailjsConfig.templates.codigo;
        if (key === "EMAILJS_TEMPLATE_RECUPERAR") return !emailjsConfig.templates.recuperar;
        if (key === "EMAILJS_SERVICE_ID") return !emailjsConfig.serviceId;
        if (key === "EMAILJS_PUBLIC_KEY") return !emailjsConfig.publicKey;
        return false;
    });
}

function emailJsConfigError(keys) {
    const missing = missingEmailJsVars(keys);
    if (missing.length === 0) return null;
    return `Falta configurar EmailJS (${missing.join(", ")}). Guardá el .env y reiniciá npm run dev.`;
}

export function isEmailJsConfigured() {
    return !emailJsConfigError([
        "EMAILJS_SERVICE_ID",
        "EMAILJS_PUBLIC_KEY",
        "EMAILJS_TEMPLATE_CODIGO",
    ]);
}

export function isEmailJsRecuperarConfigured() {
    return !emailJsConfigError([
        "EMAILJS_SERVICE_ID",
        "EMAILJS_PUBLIC_KEY",
        "EMAILJS_TEMPLATE_RECUPERAR",
    ]);
}

export async function sendCodigoIngreso({ email, nombre, codigo, dni }) {
    const configError = emailJsConfigError([
        "EMAILJS_SERVICE_ID",
        "EMAILJS_PUBLIC_KEY",
        "EMAILJS_TEMPLATE_CODIGO",
    ]);
    if (configError) {
        throw new Error(configError);
    }
    await emailjs.send(
        emailjsConfig.serviceId,
        emailjsConfig.templates.codigo,
        {
            to_email: email,
            to_name: nombre,
            codigo,
            dni,
            plataforma: "Gestión de Stock",
        },
        { publicKey: emailjsConfig.publicKey },
    );
}

export async function sendRecuperarContrasena({ email, nombre, dni, link }) {
    const configError = emailJsConfigError([
        "EMAILJS_SERVICE_ID",
        "EMAILJS_PUBLIC_KEY",
        "EMAILJS_TEMPLATE_RECUPERAR",
    ]);
    if (configError) {
        throw new Error(configError);
    }
    await emailjs.send(
        emailjsConfig.serviceId,
        emailjsConfig.templates.recuperar,
        {
            to_email: email,
            to_name: nombre,
            dni,
            link,
            plataforma: "Gestión de Stock",
        },
        { publicKey: emailjsConfig.publicKey },
    );
}
