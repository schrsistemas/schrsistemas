import Link from "next/link";

const services = [
  { icon: "01", title: "Sistemas empresariais", description: "Desenvolvimento, manutenção e evolução de sistemas de gestão, automação comercial e operações críticas." },
  { icon: "02", title: "Integrações e APIs", description: "Conexão entre sistemas, serviços externos, plataformas fiscais e processos de negócio." },
  { icon: "03", title: "IoT e automação", description: "Soluções com microcontroladores, sensores, telemetria e comunicação entre dispositivos." }
];

const projects = [
  { type: "Plataforma IoT", title: "PescaRadar", status: "Em desenvolvimento", description: "Plataforma de monitoramento ambiental e dados de sensores, com foco em conectividade e alertas." },
  { type: "Aplicação PWA", title: "Truco Intelligence", status: "Em desenvolvimento", description: "Aplicação para acompanhamento de partidas, pontuação e apoio à experiência de jogo." },
  { type: "Integração", title: "Automação e APIs", status: "Laboratório", description: "Estudos e implementações de integrações, automações de atendimento e comunicação entre serviços." }
];

const technologies = ["Delphi", "FireDAC", "Firebird", "Node.js", "PHP", "Python", "Java / Android", "React", "Next.js", "TypeScript", "Arduino", "ESP32", "APIs REST", "SQL"];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Tecnologia aplicada a problemas reais</span>
            <h1>Software que conecta ideias a <span>resultados.</span></h1>
            <p className="hero-lead">A Schr Sistemas desenvolve e integra soluções de software, automação e tecnologia. Uma atuação que une experiência em sistemas empresariais à construção de novos produtos digitais.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/projetos/">Explorar projetos <span aria-hidden="true">↗</span></Link>
              <Link className="button button-secondary" href="/contato/">Falar sobre uma solução</Link>
            </div>
          </div>
          <div className="hero-visual" aria-label="Identidade visual Schr Sistemas">
            <div className="visual-orbit" />
            <div className="visual-core"><strong>S</strong><small>SCHR SISTEMAS</small></div>
            <span className="float-tag one">Software & APIs</span>
            <span className="float-tag two">IoT & Automação</span>
            <span className="float-tag three">Sistemas</span>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Áreas de atuação">
        <div className="container trust-inner">
          <div className="trust-item"><span aria-hidden="true">⌘</span><div><strong>Software</strong>Aplicações e sistemas</div></div>
          <div className="trust-item"><span aria-hidden="true">↔</span><div><strong>Integração</strong>APIs e conectividade</div></div>
          <div className="trust-item"><span aria-hidden="true">⌁</span><div><strong>Automação</strong>Processos e dispositivos</div></div>
          <div className="trust-item"><span aria-hidden="true">◉</span><div><strong>IoT</strong>Sensores e telemetria</div></div>
        </div>
      </section>

      <section className="section section-white">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">O que fazemos</span>
            <h2>Tecnologia com visão de ponta a ponta.</h2>
            <p>Da estrutura de dados à interface, da integração ao dispositivo físico: soluções planejadas para funcionar no contexto real de cada operação.</p>
          </div>
          <div className="cards-grid">
            {services.map((service) => (
              <article className="info-card" key={service.title}>
                <div className="info-icon">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Projetos selecionados</span>
            <h2>Ideias em construção. Soluções em evolução.</h2>
            <p>Uma seleção de produtos e iniciativas próprias. Os projetos são apresentados de acordo com seu estágio atual, sem divulgar informações de clientes ou sistemas privados.</p>
          </div>
          <div className="cards-grid">
            {projects.map((project) => (
              <article className="project-card" key={project.title}>
                <div className="project-top"><span className="project-type">{project.type}</span><span className="status">{project.status}</span></div>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <Link className="text-link" href="/projetos/">Conhecer portfólio <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-white">
        <div className="container">
          <div className="section-heading">
            <span className="eyebrow">Tecnologias</span>
            <h2>Experiência em diferentes camadas.</h2>
            <p>Stack construída ao longo de projetos empresariais, integrações, aplicações web, mobile e experimentos com hardware.</p>
          </div>
          <div className="tech-cloud">{technologies.map((technology) => <span className="tech-pill" key={technology}>{technology}</span>)}</div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-panel">
            <div><h2>Tem um desafio de tecnologia?</h2><p>Vamos entender o cenário e avaliar uma solução viável, sustentável e adequada ao seu negócio.</p></div>
            <Link className="button" href="/contato/">Entrar em contato <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>
    </>
  );
}
