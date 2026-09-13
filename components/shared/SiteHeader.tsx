import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="Parasite home">
        parasite<span>.</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/about">About</Link>
        <Link href="/product/foo/bar">Product</Link>
        <Link className="nav-pill" href="/admin">Open CMS</Link>
      </nav>
    </header>
  );
}
