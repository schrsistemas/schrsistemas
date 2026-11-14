import Link from "next/link";

const links = [
  { href: "/", label: "Início" },
  { href: "/sobre/", label: "Sobre" },
  { href: "/projetos/", label: "Projetos" },
  { href: "/curriculo/", label: "Currículo" },
  { href: "/contato/", label: "Contato" }
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/" aria-label="Schr Sistemas - página inicial">
          <span className="brand-mark">S</span>
          <span className="brand-copy">
            <strong>SCHR SISTEMAS</strong>
            <small>TECNOLOGIA E DESENVOLVIMENTO</small>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Navegação principal">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>{link.label}</Link>
          ))}
        </nav>
        <Link className="header-cta" href="/contato/">Vamos conversar <span aria-hidden="true">↗</span></Link>
      </div>
    </header>
  );
}
