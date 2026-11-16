import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Schr Sistemas",
    short_name: "Schr Sistemas",
    description: "Tecnologia, desenvolvimento de software, integração e automação.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#f7f9fc",
    lang: "pt-BR"
  };
}
