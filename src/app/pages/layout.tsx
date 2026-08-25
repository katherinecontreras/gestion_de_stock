import type { ReactNode } from "react";
import { Layout } from "../layouts/Layout";

export default function PagesLayout({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>;
}
