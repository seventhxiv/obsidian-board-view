import tsparser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
    ...obsidianmd.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: tsparser,
            parserOptions: { project: "./tsconfig.json" },
        },

        rules: {
            // Obsidian PR Review Requirements
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "no-console": [
                "error",
                {
                    allow: ["warn", "error"]
                }
            ],
        },
    },
    {
        ignores: [
            "main.js",
            "*.test.ts",
            "tests/**/*",
            "node_modules/**",
            "*.config.js",
            "*.config.mjs",
            "*.config.ts",
            "version-bump.mjs",
            "esbuild.config.mjs",
        ],
    }
]);
