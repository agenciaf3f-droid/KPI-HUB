import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Componentes portados 1:1 do Dash-Editores (roda em produção hoje).
    // O lint do Next é mais estrito que o do Vite de origem; relaxamos as
    // regras que o código original viola em vez de divergir do fonte portado.
    files: ["src/components/[A-Z]*.tsx", "src/hooks/useVideoEdits.ts", "src/hooks/useClients.ts"],
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
]);

export default eslintConfig;
