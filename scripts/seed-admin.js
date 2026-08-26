/**
 * Alta puntual del primer administrador.
 * No commitear contraseñas: se pasan por SEED_ADMIN_PASSWORD al ejecutar.
 */
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const fs = require("fs");
const https = require("https");
const path = require("path");
const { URL } = require("url");

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    env[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function request(urlString, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlString);
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        family: 4,
        rejectUnauthorized: false,
        headers: {
          ...headers,
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = null;
          }
          resolve({ status: res.statusCode ?? 0, json, text });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function apiError(label, res) {
  const msg =
    res.json?.msg ||
    res.json?.message ||
    res.json?.error_description ||
    res.json?.error ||
    res.text ||
    `HTTP ${res.status}`;
  return new Error(`${label}: ${msg}`);
}

const root = path.join(__dirname, "..");
const env = { ...loadEnv(path.join(root, ".env")), ...loadEnv(path.join(root, ".env.local")) };

const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const nombre = process.env.SEED_ADMIN_NOMBRE || "Katherine";
const apellido = process.env.SEED_ADMIN_APELLIDO || "Contreras";
const dni = process.env.SEED_ADMIN_DNI || "960508223";
const email = (process.env.SEED_ADMIN_EMAIL || "katherine.contreras@simetra.com").toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;

if (!url || !serviceKey || url.includes("xxxxxxxx") || serviceKey.includes("...")) {
  console.error(
    "El archivo .env todavía tiene placeholders. Pegá las claves reales del proyecto gestion_de_stock (Settings → API) y volvé a ejecutar el seed.",
  );
  process.exit(1);
}

if (!password) {
  console.error("Definí SEED_ADMIN_PASSWORD en el entorno.");
  process.exit(1);
}

const authHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
};

async function findAuthUserId() {
  const created = await request(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: authHeaders,
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido, dni },
    },
  });

  if (created.status >= 200 && created.status < 300 && created.json?.id) {
    return created.json.id;
  }

  const duplicate =
    created.status === 422 ||
    String(created.json?.msg || created.json?.message || "")
      .toLowerCase()
      .includes("already");

  if (!duplicate) {
    throw apiError("No se pudo crear el usuario en Auth", created);
  }

  const listed = await request(`${url}/auth/v1/admin/users?page=1&per_page=1000`, {
    method: "GET",
    headers: authHeaders,
  });
  if (listed.status < 200 || listed.status >= 300) {
    throw apiError("No se pudo listar usuarios de Auth", listed);
  }

  const users = listed.json?.users || listed.json || [];
  const existing = users.find((user) => user.email?.toLowerCase() === email);
  if (!existing?.id) {
    throw new Error("El email ya existe en Auth pero no se pudo obtener el usuario.");
  }

  const updated = await request(`${url}/auth/v1/admin/users/${existing.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: { password, email_confirm: true },
  });
  if (updated.status < 200 || updated.status >= 300) {
    throw apiError("No se pudo actualizar la contraseña en Auth", updated);
  }

  return existing.id;
}

(async () => {
  console.log("Proyecto:", new URL(url).host);
  const authUserId = await findAuthUserId();

  const existing = await request(
    `${url}/rest/v1/responsables?dni=eq.${encodeURIComponent(dni)}&select=id`,
    { method: "GET", headers: { ...authHeaders, Accept: "application/json" } },
  );
  if (existing.status < 200 || existing.status >= 300) {
    throw apiError("No se pudo consultar responsables", existing);
  }

  const payload = {
    auth_user_id: authUserId,
    nombre,
    apellido,
    dni,
    email,
    id_rol: 1,
    estado: "activo",
    registrado: true,
    registrado_en: new Date().toISOString(),
  };

  const currentId = Array.isArray(existing.json) ? existing.json[0]?.id : null;
  const saved = currentId
    ? await request(`${url}/rest/v1/responsables?id=eq.${currentId}`, {
        method: "PATCH",
        headers: { ...authHeaders, Prefer: "return=minimal" },
        body: payload,
      })
    : await request(`${url}/rest/v1/responsables`, {
        method: "POST",
        headers: { ...authHeaders, Prefer: "return=minimal" },
        body: payload,
      });

  if (saved.status < 200 || saved.status >= 300) {
    throw apiError("No se pudo guardar el responsable", saved);
  }

  console.log(currentId ? "OK: responsable actualizado" : "OK: responsable creado", dni);
})().catch((err) => {
  console.error("Error:", err.message || err);
  if (err.code) console.error("Código:", err.code);
  process.exit(1);
});
