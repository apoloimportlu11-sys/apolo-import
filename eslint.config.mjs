import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "scripts/**",
      "eslint-report.json",
    ],
  },
  {
    rules: {
      // Errores bloquean CI. Deuda histórica baja a warning para endurecer después.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-namespace": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-img-element": "warn",
      "prefer-const": "warn",
    },
  },
];

export default eslintConfig;
