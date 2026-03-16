# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — run ESLint (flat config, ESLint 9)

## Architecture

Next.js 16 App Router project with TypeScript, React 19, and Tailwind CSS 4.

- `app/` — all routes and layouts use the App Router convention (layout.tsx, page.tsx, etc.)
- `@/*` path alias maps to the project root (configured in tsconfig.json)
- Fonts: Geist Sans and Geist Mono loaded via `next/font/google` in the root layout
- Styling: Tailwind CSS 4 via PostCSS (`@tailwindcss/postcss`), global styles in `app/globals.css`
- ESLint: flat config (`eslint.config.mjs`) extending `next/core-web-vitals` and `next/typescript`
