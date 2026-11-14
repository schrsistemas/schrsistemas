import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Link className="footer-brand" href="/">SCHR SISTEMAS</Link>
          <p>Software, integração e automação para resolver problemas reais.</p>
        </div>
        <div className="footer-links">
          <Link href="/sobre/">Sobre</Link>
          <Link href="/projetos/">Projetos</Link>
          <Link href="/curriculo/">Currículo</Link>
          <Link href="/contato/">Contato</Link>
        </div>
        <small>© {new Date().getFullYear()} Schr Sistemas. Conteúdo sujeito a atualização.</small>
      </div>
    </footer>
  );
}
