import type { ReactNode } from "react";
import { AdminDataProvider } from "./_data/AdminDataProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminDataProvider><main className="admin-main">{children}</main></AdminDataProvider>;
}
