import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ThemeProviderWrapper } from "./theme-provider";
import "./globals.css";

const siteUrl = "https://schrsistemas.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Schr Sistemas | Desenvolvimento de Software e Soluções",
    template: "%s | Schr Sistemas"
  },
  description: "Desenvolvimento de software, sistemas empresariais, integrações, automação e soluções IoT. Conheça a Schr Sistemas e o trabalho de Daniel Schroeder.",
  applicationName: "Schr Sistemas",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Schr Sistemas",
    title: "Schr Sistemas | Tecnologia e Desenvolvimento",
    description: "Software, integração e automação para resolver problemas reais."
  },
  twitter: {
    card: "summary",
    title: "Schr Sistemas | Tecnologia e Desenvolvimento",
    description: "Software, integração e automação para resolver problemas reais."
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f9fc"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProviderWrapper>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
