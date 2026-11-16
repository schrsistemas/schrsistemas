import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contato",
  description: "Entre em contato com a Schr Sistemas para conversar sobre desenvolvimento, integração e automação.",
  alternates: { canonical: "/contato/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://schrsistemas.com/contato/",
    siteName: "Schr Sistemas",
    title: "Contato | Schr Sistemas",
    description: "Entre em contato para conversar sobre desenvolvimento, integração e automação."
  },
  twitter: {
    card: "summary",
    title: "Contato | Schr Sistemas",
    description: "Entre em contato para conversar sobre desenvolvimento, integração e automação."
  }
};

export default function ContactPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Contato</span>
          <h1>Vamos conversar<br />sobre sua necessidade.</h1>
          <p>Conte o contexto, o desafio e o resultado esperado. O primeiro passo é entender o problema antes de propor tecnologia.</p>
        </div>
      </section>
      <section className="content-section">
        <div className="container contact-grid">
          <article className="contact-card">
            <strong>E-mail</strong>
            <p>Para propostas, dúvidas e contato profissional.</p>
            <a href="mailto:schrsistemas@gmail.com">schrsistemas@gmail.com</a>
          </article>
          <article className="contact-card">
            <strong>WhatsApp</strong>
            <p>Contato direto para conversar sobre projetos e soluções.</p>
            <a href="https://wa.me/5547997368457" target="_blank" rel="noreferrer">Iniciar conversa ↗</a>
          </article>
          <article className="contact-card">
            <strong>LinkedIn</strong>
            <p>Perfil profissional e conexões.</p>
            <a href="https://www.linkedin.com/in/schrsistemas/" target="_blank" rel="noreferrer">linkedin.com/in/schrsistemas ↗</a>
          </article>
          <article className="contact-card">
            <strong>GitHub</strong>
            <p>Repositórios públicos e projetos de desenvolvimento.</p>
            <a href="https://github.com/schrsistemas" target="_blank" rel="noreferrer">github.com/schrsistemas ↗</a>
          </article>
        </div>
      </section>
    </>
  );
}
