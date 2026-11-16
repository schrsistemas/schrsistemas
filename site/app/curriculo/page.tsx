import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Currículo",
  description: "Currículo e competências técnicas de Daniel Schroeder, analista e desenvolvedor de sistemas.",
  alternates: { canonical: "/curriculo/" },
  openGraph: {
    type: "profile",
    locale: "pt_BR",
    url: "https://schrsistemas.com/curriculo/",
    siteName: "Schr Sistemas",
    title: "Currículo | Daniel Schroeder",
    description: "Perfil profissional e competências em desenvolvimento de sistemas, integração e automação."
  },
  twitter: {
    card: "summary",
    title: "Currículo | Daniel Schroeder",
    description: "Perfil profissional e competências em desenvolvimento de sistemas, integração e automação."
  }
};

const groups = [
  { title: "Desenvolvimento desktop e backend", items: ["Delphi e FireDAC", "Node.js e APIs REST", "PHP", "Python"] },
  { title: "Banco de dados", items: ["Firebird 2.5 e migração para Firebird 5", "SQL", "Modelagem e diagnóstico de banco de dados"] },
  { title: "Web e mobile", items: ["React e Next.js", "TypeScript", "Java para Android", "HTML e CSS"] },
  { title: "Integração e automação", items: ["Integrações fiscais: NF-e, NFC-e e CT-e", "ACBr", "Arduino e ESP32", "Sensores, dispositivos e comunicação serial"] }
];

export default function ResumePage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Perfil profissional</span>
          <h1>Daniel Schroeder</h1>
          <p>Analista e desenvolvedor de sistemas · Sistemas empresariais · Integrações · Automação</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/contato/">Contato profissional <span aria-hidden="true">↗</span></Link>
            <a className="button button-secondary" href="https://www.linkedin.com/in/schrsistemas/" target="_blank" rel="noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>
      <section className="content-section">
        <div className="container">
          <div className="prose" style={{ marginBottom: 30 }}>
            <h2>Resumo profissional</h2>
            <p>Profissional de tecnologia com mais de 15 anos de experiência em desenvolvimento e sustentação de sistemas corporativos, automação comercial e integrações fiscais. Atuação em ambientes de produção, manutenção de sistemas legados, diagnóstico de problemas, banco de dados e integração com serviços e dispositivos.</p>
            <p>Perfil orientado à resolução de problemas de negócio, com visão de ponta a ponta entre aplicação, dados, infraestrutura e operação.</p>
          </div>
          <div className="resume-grid">
            {groups.map((group) => (
              <section className="resume-block" key={group.title}>
                <h2>{group.title}</h2>
                <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            ))}
            <section className="resume-block">
              <h2>Domínios de atuação</h2>
              <ul>
                <li>ERP e automação comercial</li>
                <li>Documentos fiscais eletrônicos</li>
                <li>Integração de hardware e periféricos</li>
                <li>Modernização e migração de sistemas legados</li>
                <li>Automação de processos e ferramentas internas</li>
              </ul>
            </section>
            <section className="resume-block">
              <h2>Projetos e evolução</h2>
              <ul>
                <li>Plataformas IoT e monitoramento ambiental</li>
                <li>Aplicações web responsivas e PWA</li>
                <li>Integrações, bots e automações</li>
                <li>IA aplicada a fluxos de suporte e produtividade</li>
              </ul>
            </section>
          </div>
          <p className="prose" style={{ marginTop: 25 }}>Este currículo é um resumo público. Detalhes de empresas, clientes, períodos e entregas específicas devem ser complementados e validados antes de utilizar o conteúdo em processos seletivos formais.</p>
        </div>
      </section>
    </>
  );
}
