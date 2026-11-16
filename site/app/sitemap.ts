import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://schrsistemas.com";
  const routes = ["", "/sobre", "/projetos", "/curriculo", "/contato"];

  return routes.map((route) => ({
    url: `${baseUrl}${route}/`,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7
  }));
}
