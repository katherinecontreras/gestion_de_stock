import type { ReactNode } from "react";

export default function AutenticationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center overflow-y-auto bg-app-bg px-4 py-6">
      {children}
    </div>
  );
}
