import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <main className="admin-main">{children}</main>;
}
