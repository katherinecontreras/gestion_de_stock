import type { NextConfig } from "next";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/login", destination: "/autentication/login", permanent: false },
      { source: "/registro", destination: "/autentication/registro", permanent: false },
      { source: "/recuperar", destination: "/autentication/recuperar", permanent: false },
      { source: "/articulos", destination: "/pages/articulos", permanent: false },
      { source: "/articulos/:id", destination: "/pages/articulos/:id", permanent: false },
      { source: "/familias", destination: "/pages/familias", permanent: false },
      { source: "/familias/:id", destination: "/pages/familias/:id", permanent: false },
      { source: "/proveedores", destination: "/pages/proveedores", permanent: false },
      { source: "/depositos", destination: "/pages/depositos", permanent: false },
      { source: "/movimientos/nuevo", destination: "/pages/movimientos/nuevo", permanent: false },
      { source: "/movimientos/:id", destination: "/pages/movimientos/:id", permanent: false },
      { source: "/movimientos", destination: "/pages/movimientos", permanent: false },
      { source: "/responsables", destination: "/pages/responsables", permanent: false },
      { source: "/notificaciones", destination: "/pages/notificaciones", permanent: false },
    ];
  },
};

export default nextConfig;
