import type { ReactNode } from "react";
import { MarketingShell } from "@/components/shared/MarketingShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
