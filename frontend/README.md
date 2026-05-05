# StratosERP Production UI

This frontend is the production-style role portal for StratosERP Phase-I modules.

It includes dedicated role portals for:

- Admin
- HOD
- Class Incharge
- Subject Incharge
- Practical Teacher
- Teacher Guardian
- Student

Each portal provides:

- Workflow priorities and module health dashboards
- Operational endpoint execution cards mapped to backend APIs
- Editable JSON payloads for POST/PUT operations
- Activity timeline and response inspection surfaces

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Set API base URL (optional):

```bash
copy .env.example .env.local
```

3. Run dev server:

```bash
npm run dev
```

4. Open the app:

http://localhost:3000

## How to Test Endpoints

1. Use the "Access Control Console" on the home page.
2. Login as faculty or student to obtain and store JWT.
3. Open any role portal and run operation cards.
4. Edit JSON payloads and rerun to test edge scenarios.

## API Notes

- Frontend requests go through `src/app/api/proxy/route.ts` to avoid browser CORS issues during local testing.
- JWT and API base URL are stored in browser local storage keys:
	- `stratos.jwtToken`
	- `stratos.apiBaseUrl`

## Build

```bash
npm run build
```
