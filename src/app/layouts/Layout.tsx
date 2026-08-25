"use client";

import { useState, type ReactNode } from "react";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

type LayoutProps = {
  children: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-app-bg">
      <Navbar />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-office px-3 py-4 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
