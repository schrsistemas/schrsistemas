import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page-hero">
      <div className="container">
        <span className="eyebrow">Erro 404</span>
        <h1>Esta página<br />não foi encontrada.</h1>
        <p>O endereço pode ter mudado ou não existir. Volte ao início para continuar navegando.</p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/">Voltar ao início <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </section>
  );
}
