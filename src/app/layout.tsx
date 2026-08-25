import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "./layouts/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestión de Stock | Simetra Service SA",
  description:
    "Plataforma de registro de artículos, depósitos, proveedores y movimientos de stock de Simetra Service SA.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
