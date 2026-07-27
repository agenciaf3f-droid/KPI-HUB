import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      // Painel do Editor: build Vite ORIGINAL do Dash-Editores, servido estático
      // de public/editor/. SPA fallback — toda rota do app cai no index.html
      // (assets reais em /editor/assets/* têm precedência por serem arquivos).
      { source: "/editor", destination: "/editor/index.html" },
      { source: "/editor/redefinir-senha", destination: "/editor/index.html" },
      // Painel do Gestor: dashboard.html ORIGINAL do Dash-Gestores (autocontido,
      // Chart.js via CDN). Fala com /api/leadtime e /api/config desta origem.
      { source: "/gestor", destination: "/dashboard.html" },
    ];
  },
};

export default nextConfig;
