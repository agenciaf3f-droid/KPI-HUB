import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const poppins = Poppins({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const glacialIndifference = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "./fonts/GlacialIndifference-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/GlacialIndifference-Bold.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Controle de Criação",
  description: "Controle de Criação para acompanhar entregas, capacidade e métricas da equipe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${poppins.variable} ${glacialIndifference.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">{`
          try {
            const theme = localStorage.getItem("kpi-theme");
            const nextTheme = theme === "dark" ? "dark" : "light";
            document.documentElement.classList.toggle("dark", nextTheme === "dark");
            document.documentElement.style.colorScheme = nextTheme;
          } catch {}
        `}</Script>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
