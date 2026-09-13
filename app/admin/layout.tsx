import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span className="brand-symbol">P</span>
          <span>Parasite</span>
          <small>CMS</small>
        </Link>
        <nav>
          <Link className="active" href="/admin"><span>◇</span> Entries</Link>
          <span className="nav-disabled"><span>⌁</span> Releases <small>Soon</small></span>
        </nav>
        <div className="admin-sidebar-bottom">
          <Link href="/" target="_blank"><span>↗</span> View website</Link>
          <div className="workspace-chip">
            <span>PA</span>
            <div><strong>Parasite</strong><small>Local workspace</small></div>
          </div>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
