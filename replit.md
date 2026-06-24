# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Law firm management web application for **Rishika Nagpal & Associates**, Subhash Nagar, New Delhi.

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
- **Frontend**: React + Vite, React Query, Framer Motion, React Hook Form

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── law-firm/           # React frontend (Vite)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

### Users table (`users`)
- id (serial PK)
- name (text)
- bar_id (text, nullable)
- email (text, unique)
- role (Admin | Advocate | Intern)
- created_at (timestamp)

### Cases table (`cases`)
- id (serial PK)
- case_title (text)
- case_number (text)
- court_name (text)
- next_date (text, nullable)
- status (Active | Pending | Closed | Adjourned)
- created_at (timestamp)

### Tasks table (`tasks`)
- id (serial PK)
- task_description (text)
- fee (text, nullable)
- location (text, nullable)
- status (Pending | In Progress | Completed | Cancelled)
- created_at (timestamp)

## Frontend Pages

### Three Portals
- **Client Portal** (`/client/*`) — Book advocates, encrypted chat, DIY docs, AI assistant, legal guides, case tracker, wellness quiz
- **Advocate Portal** (`/advocate/*`) — Diary, calls, encrypted client chat, booking management, judges roster
- **Intern Portal** (`/intern/*`) — XP/levels, quests, leaderboard, badges

### Client Portal Key Pages
- **Case Tracker** (`/client/cases`) — eCourt-synced case tracker with search by party name, FIR number, CNR number, case number; filter by case type (criminal/civil/consumer/family/labour/property); 5 case types with progress timelines, last orders, petitioner/respondent info, eCourt quick-links
- **Book Advocate** (`/client/book`) — 8 advocates with tiered fees (₹500–₹3000/hr)
- **Connect Chat** (`/client/connect`) — Encrypted chat with advocates (₹50/5 min, first chat FREE)
- **AI Assistant** (`/client/ai`) — OpenAI-powered legal assistant

### Homepage
- **Home** (`/`) — Dharma Chakra, animated news carousel, rotating hero taglines, three portal cards

## Brand Identity

- **Color Palette**: Navy Blue, Charcoal, Gold
- **Vibe**: Trustworthy & Tech-Forward
- **Firm**: Rishika Nagpal & Associates, Subhash Nagar, New Delhi

## API Routes

All routes at `/api`:
- `GET/POST /users`
- `GET/PUT/DELETE /users/:id`
- `GET/POST /cases`
- `GET/PUT/DELETE /cases/:id`
- `GET/POST /tasks`
- `GET/PUT/DELETE /tasks/:id`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Codegen

Run codegen after OpenAPI spec changes:
```
pnpm --filter @workspace/api-spec run codegen
```

Push DB schema changes:
```
pnpm --filter @workspace/db run push
```
