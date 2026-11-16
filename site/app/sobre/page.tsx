import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Conheça a Schr Sistemas e a trajetória profissional de Daniel Schroeder.",
  alternates: { canonical: "/sobre/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://schrsistemas.com/sobre/",
    siteName: "Schr Sistemas",
    title: "Sobre a Schr Sistemas",
    description: "Conheça a atuação da Schr Sistemas em desenvolvimento de software, sistemas empresariais, integração e automação."
  },
  twitter: {
    card: "summary",
    title: "Sobre a Schr Sistemas",
    description: "Desenvolvimento de software, sistemas empresariais, integração e automação."
  }
};

export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Sobre a Schr Sistemas</span>
          <h1>Experiência prática.<br />Visão de produto.</h1>
          <p>Uma marca de tecnologia com atuação profissional em desenvolvimento de software, sistemas empresariais, integração e automação.</p>
        </div>
      </section>
      <section className="content-section">
        <div className="container prose">
          <h2>Daniel Schroeder</h2>
          <p>Analista e desenvolvedor de sistemas, com trajetória superior a 15 anos em tecnologia, especialmente em sistemas corporativos, automação comercial e integrações fiscais.</p>
          <p>A experiência envolve manutenção e evolução de aplicações em produção, diagnóstico de incidentes, bancos de dados, comunicação com dispositivos e integração de serviços. O foco é compreender o problema operacional e construir soluções que possam ser mantidas e evoluídas.</p>
          <h2>Como trabalhamos</h2>
          <ul>
            <li><strong>Entendimento do contexto:</strong> compreender a operação, as restrições e os objetivos antes de escolher a tecnologia.</li>
            <li><strong>Integração:</strong> conectar sistemas existentes, APIs, bancos de dados e dispositivos.</li>
            <li><strong>Evolução gradual:</strong> respeitar o legado, preservar o que funciona e reduzir riscos de mudanças desnecessárias.</li>
            <li><strong>Sustentabilidade:</strong> priorizar arquitetura simples, documentação e custos operacionais controlados.</li>
          </ul>
          <h2>Uma atuação híbrida</h2>
          <p>A Schr Sistemas representa a frente de desenvolvimento e soluções tecnológicas. O portfólio também apresenta a trajetória, as competências e os projetos autorais de Daniel, distinguindo iniciativas experimentais, produtos em desenvolvimento e experiências profissionais.</p>
          <p><Link className="text-link" href="/curriculo/">Ver currículo profissional <span aria-hidden="true">→</span></Link></p>
        </div>
      </section>
    </>
  );
}
