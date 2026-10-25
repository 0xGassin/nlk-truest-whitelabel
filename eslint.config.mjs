import eslintJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintReact from "@eslint-react/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import nextPlugin from "@next/eslint-plugin-next";
import unicornPlugin from "eslint-plugin-unicorn";
import perfectionistPlugin from "eslint-plugin-perfectionist";
import tailwindcssPlugin from "eslint-plugin-tailwindcss";
import promisePlugin from "eslint-plugin-promise";
import nPlugin from "eslint-plugin-n";
import securityPlugin from "eslint-plugin-security";
import noSecretsPlugin from "eslint-plugin-no-secrets";
import eslintCommentsPlugin from "@eslint-community/eslint-plugin-eslint-comments";
import prettierConfig from "eslint-config-prettier";

const RULES_ALL = {
  ...unicornPlugin.configs["flat/recommended"].rules,
  // --- Unicorn overrides ---
  "unicorn/consistent-function-scoping": "warn",
  "unicorn/custom-error-definition": "off",
  "unicorn/error-message": "error",
  "unicorn/explicit-length-check": "warn",
  "unicorn/filename-case": ["error", { case: "kebabCase" }],
  // unicorn 76 targets ESLint 10's tuple-schema validator. Keep this rule
  // disabled while this project remains on ESLint 9.
  "unicorn/logical-assignment-operators": "off",
  "unicorn/new-for-builtins": "error",
  "unicorn/no-array-callback-reference": "off",
  "unicorn/no-array-for-each": "off",
  "unicorn/no-array-reduce": "off",
  "unicorn/no-await-expression-member": "warn",
  "unicorn/no-for-loop": "warn",
  "unicorn/no-instanceof-builtins": "off",
  "unicorn/no-null": "off",
  "unicorn/no-useless-undefined": "warn",
  "unicorn/number-literal-case": "off",
  "unicorn/prefer-at": "warn",
  "unicorn/prefer-blob-reading-methods": "error",
  "unicorn/prefer-code-point": "warn",
  "unicorn/prefer-date-now": "error",
  "unicorn/prefer-dom-node-append": "error",
  "unicorn/prefer-dom-node-dataset": "warn",
  "unicorn/prefer-dom-node-remove": "error",
  "unicorn/prefer-dom-node-text-content": "error",
  "unicorn/prefer-export-from": ["warn", { checkUsedVariables: false }],
  "unicorn/prefer-global-this": "error",
  "unicorn/prefer-includes": "error",
  "unicorn/prefer-modern-dom-apis": "error",
  "unicorn/prefer-module": "warn",
  "unicorn/prefer-native-coercion-functions": "warn",
  "unicorn/prefer-node-protocol": "error",
  "unicorn/prefer-number-properties": "error",
  "unicorn/prefer-optional-catch-binding": "error",
  "unicorn/prefer-query-selector": "error",
  "unicorn/prefer-set-has": "error",
  "unicorn/prefer-set-size": "error",
  "unicorn/prefer-spread": "warn",
  "unicorn/prefer-string-replace-all": "error",
  "unicorn/prefer-string-slice": "error",
  "unicorn/prefer-string-starts-ends-with": "error",
  "unicorn/prefer-structured-clone": "error",
  "unicorn/prefer-switch": "warn",
  "unicorn/prefer-ternary": "off",
  "unicorn/prefer-top-level-await": "warn",
  "unicorn/prevent-abbreviations": "off",
  "unicorn/relative-url-style": ["warn", "always"],
  "unicorn/string-content": "off",
  "unicorn/switch-case-braces": ["warn", "avoid"],
  "unicorn/throw-new-error": "error",

  // --- Perfectionist (sorting) ---
  "perfectionist/sort-array-includes": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-enums": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-exports": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-heritage-clauses": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-import-attributes": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-imports": [
    "error",
    {
      type: "alphabetical",
      order: "asc",
      internalPattern: ["^@/"],
      newlinesBetween: 1,
      groups: ["type", ["builtin", "external"], "internal", ["parent", "sibling", "index"], "style"],
    },
  ],
  "perfectionist/sort-interfaces": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-intersection-types": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-jsx-props": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-maps": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-named-exports": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-named-imports": ["warn", { type: "alphabetical", order: "asc", ignoreAlias: false }],
  "perfectionist/sort-object-types": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-objects": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-sets": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-switch-case": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-union-types": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-variable-declarations": ["warn", { type: "alphabetical", order: "asc" }],
  "perfectionist/sort-classes": "off",
  "perfectionist/sort-decorators": "off",
  "perfectionist/sort-modules": "off",

  // --- Tailwind CSS ---
  "tailwindcss/classnames-order": "warn",
  "tailwindcss/enforces-negative-arbitrary-values": "warn",
  "tailwindcss/enforces-shorthand": "warn",
  "tailwindcss/no-custom-classname": "warn",
  "tailwindcss/no-contradicting-classname": "error",
  "tailwindcss/no-unnecessary-arbitrary-value": "warn",

  // --- Promise ---
  ...promisePlugin.configs["flat/recommended"].rules,
  "promise/prefer-await-to-callbacks": "warn",
  "promise/prefer-await-to-then": "warn",

  // --- Node ---
  ...nPlugin.configs["flat/recommended-module"].rules,
  "n/no-missing-import": "off",
  "n/no-process-env": "off",
  "n/no-sync": "warn",
  "n/no-unsupported-features/es-syntax": "off",
  "n/no-unsupported-features/node-builtins": "off",
  "n/prefer-global/process": ["warn", "never"],
  "n/prefer-promises/fs": "warn",

  // --- Security ---
  ...securityPlugin.configs.recommended.rules,
  "security/detect-buffer-noassert": "error",
  "security/detect-child-process": "error",
  "security/detect-disable-mustache-escape": "error",
  "security/detect-eval-with-expression": "error",
  "security/detect-new-buffer": "error",
  "security/detect-no-csrf-before-method-override": "error",
  "security/detect-non-literal-fs-filename": "warn",
  "security/detect-non-literal-regexp": "warn",
  "security/detect-non-literal-require": "warn",
  "security/detect-object-injection": "off",
  "security/detect-possible-timing-attacks": "warn",
  "security/detect-pseudoRandomBytes": "warn",
  "security/detect-unsafe-regex": "error",

  // --- No Secrets ---
  "no-secrets/no-secrets": [
    "error",
    {
      tolerance: 4.6,
      additionalRegexes: {
        "aws-access-key": "AKIA[0-9A-Z]{16}",
        "github-token": "gh[pousr]_[A-Za-z0-9_]{36,}",
        "private-key": "-----BEGIN (RSA |EC )?PRIVATE KEY-----",
        "jwt-token": "eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}",
        "npm-token": "npm_[A-Za-z0-9]{36}",
        "stripe-live": "(?:sk|pk)_live_[0-9a-zA-Z]{24,}",
        "stripe-test": "(?:sk|pk)_test_[0-9a-zA-Z]{24,}",
      },
    },
  ],

  // --- ESLint Comments ---
  ...eslintCommentsPlugin.configs.recommended.rules,
  "@eslint-community/eslint-comments/disable-enable-pair": ["error", { allowWholeFile: true }],
  "@eslint-community/eslint-comments/no-aggregating-enable": "error",
  "@eslint-community/eslint-comments/no-duplicate-disable": "error",
  "@eslint-community/eslint-comments/no-unlimited-disable": "error",
  "@eslint-community/eslint-comments/no-unused-enable": "error",
  "@eslint-community/eslint-comments/require-description": "off",

  // --- Import plugin ---
  ...importPlugin.flatConfigs.recommended.rules,
  ...importPlugin.flatConfigs.typescript.rules,
  "import/consistent-type-specifier-style": ["warn", "prefer-top-level"],
  "import/first": "warn",
  "import/newline-after-import": "warn",
  "import/no-absolute-path": "error",
  "import/no-amd": "error",
  "import/no-anonymous-default-export": "warn",
  "import/no-cycle": "warn",
  "import/no-default-export": "off",
  "import/no-deprecated": "warn",
  "import/no-duplicates": "warn",
  "import/no-empty-named-blocks": "warn",
  "import/no-extraneous-dependencies": "error",
  "import/no-mutable-exports": "error",
  "import/no-named-as-default": "off",
  "import/no-named-as-default-member": "off",
  "import/no-restricted-paths": [
    "error",
    {
      zones: [
        { target: "./src/features", from: "./src/app" },
        {
          target: ["./src/components", "./src/hooks", "./src/lib", "./src/types", "./src/utils"],
          from: ["./src/features", "./src/app"],
        },
      ],
    },
  ],
  "import/no-self-import": "error",
  "import/no-unassigned-import": ["error", { allow: ["**/*.css"] }],
  "import/no-unused-modules": "warn",
  "import/no-useless-path-segments": "warn",
};

const PLUGINS = {
  "react-hooks": reactHooks,
  "react-refresh": reactRefresh,
  unicorn: unicornPlugin.default || unicornPlugin,
  perfectionist: perfectionistPlugin,
  tailwindcss: tailwindcssPlugin,
  promise: promisePlugin,
  n: nPlugin,
  security: securityPlugin,
  "no-secrets": noSecretsPlugin,
  "@eslint-community/eslint-comments": eslintCommentsPlugin,
  import: importPlugin,
};

export default tseslint.config(
  // ── Global ignores ──────────────────────────────────────────────
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "node_modules/**",
      "next-env.d.ts",
      "*.generated.*",
      "coverage/**",
      "next.config.ts",
    ],
  },

  // ── ESLint recommended ──────────────────────────────────────────
  eslintJs.configs.recommended,

  // ── TypeScript base (parser, no type-checking) ───────────────────
  ...tseslint.configs.strictTypeChecked.slice(0, 2), // base + eslint-recommended (have files filters)
  ...tseslint.configs.stylisticTypeChecked.slice(0, 2),

  // ── TypeScript strict + stylistic (type-checked, scoped to src/) ─
  {
    files: ["src/**/*.{ts,tsx}"],
    ...tseslint.configs.strictTypeChecked[2],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ...tseslint.configs.stylisticTypeChecked[2],
  },
  // ── React (@eslint-react) ───────────────────────────────────────
  eslintReact.configs["recommended-typescript"],

  // ── JSX A11y ────────────────────────────────────────────────────
  jsxA11y.flatConfigs.recommended,

  // ── Next.js ─────────────────────────────────────────────────────
  {
    name: "truest/next",
    plugins: { "@next/next": nextPlugin },
    rules: nextPlugin.configs["core-web-vitals"].rules,
  },

  // ── Everything else ─────────────────────────────────────────────
  {
    name: "truest/main",
    files: ["src/**/*.{ts,tsx}"],

    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },

    plugins: PLUGINS,

    settings: {
      "import/extensions": importPlugin.flatConfigs.typescript.settings["import/extensions"],
      "import/external-module-folders": importPlugin.flatConfigs.typescript.settings["import/external-module-folders"],
      "import/parsers": importPlugin.flatConfigs.typescript.settings["import/parsers"],
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
      },
      tailwindcss: {
        callees: ["cn", "clsx", "cva"],
        cssConfigPath: "./src/app/globals.css",
        classRegex: "^(class(Name)?|className)$",
      },
      react: { version: "detect" },
    },

    rules: {
      // ── React Hooks ──
      ...reactHooks.configs.recommended.rules,
      "react-hooks/exhaustive-deps": "warn",

      // ── React Refresh ──
      "react-refresh/only-export-components": "warn",

      // ── TypeScript strictness dials ──
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: { string: true } }],

      // ── @eslint-react strictness dials ──
      "@eslint-react/no-missing-key": "error",
      "@eslint-react/no-unstable-default-props": "error",

      // ── All additional lint rules ──
      ...RULES_ALL,
    },
  },

  // ── Overrides ───────────────────────────────────────────────────
  {
    name: "truest/overrides/test",
    files: ["src/**/*.{test,spec}.{ts,tsx}", "src/__tests__/**/*.{ts,tsx}"],
    rules: {
      "import/no-extraneous-dependencies": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-refresh/only-export-components": "off",
      "unicorn/consistent-function-scoping": "off",
      "unicorn/no-await-expression-member": "off",
      "no-secrets/no-secrets": "off",
      "security/detect-object-injection": "off",
    },
  },
  {
    name: "truest/overrides/ui",
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
      "import/no-default-export": "off",
      "unicorn/filename-case": "off",
    },
  },
  {
    name: "truest/overrides/app-router",
    files: ["src/app/**/*.{ts,tsx}"],
    rules: {
      "import/no-default-export": "off",
      "react-refresh/only-export-components": "off",
      "unicorn/filename-case": "off",
      "perfectionist/sort-exports": "off",
    },
  },
  {
    name: "truest/overrides/config",
    files: ["*.config.{ts,js,mjs}"],
    rules: {
      "import/no-default-export": "off",
      "import/no-anonymous-default-export": "off",
      "unicorn/prefer-module": "off",
      "unicorn/filename-case": "off",
    },
  },

  // ── Prettier (last so it wins formatting conflicts) ─────────────
  prettierConfig,
);
