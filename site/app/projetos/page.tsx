import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Projetos",
  description: "Projetos e iniciativas da Schr Sistemas em software, IoT, automação e integrações."
};

const projects = [
  {
    category: "IoT e monitoramento",
    name: "PescaRadar",
    state: "Em desenvolvimento",
    summary: "Plataforma voltada ao monitoramento ambiental, coleta de dados de sensores e geração de alertas.",
    details: ["Integração com dispositivos e sensores", "Arquitetura de webhooks de entrada e saída", "Contexto de monitoramento e alertas ambientais"],
    stack: "Web · IoT · APIs · ESP32"
  },
  {
    category: "Aplicação web e PWA",
    name: "Truco Intelligence",
    state: "Em desenvolvimento",
    summary: "Aplicação para registrar partidas, acompanhar pontuação e evoluir recursos de apoio ao jogo.",
    details: ["Experiência responsiva para celular", "Estratégia de funcionamento offline com PWA", "Evolução incremental de funcionalidades"],
    stack: "Next.js · TypeScript · PWA"
  },
  {
    category: "Automação e integração",
    name: "Integrações e ferramentas",
    state: "Laboratório",
    summary: "Estudos e soluções para integrar sistemas, automatizar rotinas e simplificar fluxos operacionais.",
    details: ["APIs REST e serviços externos", "Automação de processos", "Integração entre aplicações e dispositivos"],
    stack: "Node.js · PHP · Python · APIs"
  }
];

export default function ProjectsPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">Portfólio</span>
          <h1>Projetos, produtos<br />e experimentação.</h1>
          <p>Uma visão transparente de iniciativas próprias e áreas de atuação. Os status indicam o estágio de cada projeto e não representam disponibilidade comercial.</p>
        </div>
      </section>
      <section className="content-section">
        <div className="container">
          <div className="cards-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.name}>
                <div className="project-top"><span className="project-type">{project.category}</span><span className="status">{project.state}</span></div>
                <h3>{project.name}</h3>
                <p>{project.summary}</p>
                <ul className="project-details">{project.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
                <p><strong>Stack:</strong> {project.stack}</p>
              </article>
            ))}
          </div>
          <div className="prose" style={{ marginTop: 38 }}>
            <h2>Projetos profissionais e confidencialidade</h2>
            <p>Parte da experiência profissional está vinculada a sistemas privados e ambientes de clientes. Por confidencialidade, esses trabalhos são descritos por domínio técnico e tipo de solução, sem publicação de código, dados, credenciais ou informações operacionais.</p>
            <p><Link className="text-link" href="/contato/">Conversar sobre um projeto <span aria-hidden="true">→</span></Link></p>
          </div>
        </div>
      </section>
    </>
  );
}
