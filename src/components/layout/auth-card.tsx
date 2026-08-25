import type { ReactNode } from "react";
import { Brand } from "@/components/layout/brand";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-sm shrink-0 rounded-2xl border border-app-border bg-app-surface px-6 py-6 shadow-card">
      <Brand stacked className="mb-5" />
      <div className="mb-4 text-center">
        <h1 className="text-lg font-bold text-app-primary">{title}</h1>
        <p className="mt-1 text-[13px] leading-5 text-app-mutedtext">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
