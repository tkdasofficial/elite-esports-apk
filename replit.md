# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (`artifacts/apk-download`)

## Artifacts

### APK Download Page (`artifacts/apk-download`)
- Single-page professional APK download landing page styled like Google Play Store
- Primary color: orange-red
- Light/dark system theme via `next-themes`
- Preview path: `/` (root)
- Dev port: 20984

### API Server (`artifacts/api-server`)
- Express 5 backend serving `/api` routes
- Routes: `/api/app/info`, `/api/app/download`, `/api/ratings`, `/api/ratings/summary`
- Dev port: 8080

## Workflows

- **Start application** — runs the React + Vite frontend (`PORT=20984`)
- **API Server** — runs the Express API server (`PORT=8080`)
- Both are started together via the **Project** workflow (run button)

## Database Schema

### `app_info` table
Stores app metadata: name, developer, description, version, file size, package name, category, tags, download count, permissions, whats new, content rating, download URL, icon URL, release dates.

### `ratings` table
Stores user reviews: user name, stars (1-5), review text, helpful count, created at.

## APK Download
The APK download URL points to Google Drive direct download:
`https://drive.google.com/uc?export=download&id=1m_h9zmeHkzFacPRQk5P85vJhKimsVuMp`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/apk-download run build` — build the React frontend
- `pnpm --filter @workspace/api-server run build` — build the API server

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
