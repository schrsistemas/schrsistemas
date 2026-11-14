import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://schrsistemas.com";
  const routes = ["", "/sobre", "/projetos", "/curriculo", "/contato"];

  return routes.map((route) => ({
    url: `${baseUrl}${route}/`,
    lastModified: new Date("2026-11-14"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7
  }));
}
