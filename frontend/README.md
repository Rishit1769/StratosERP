# StratosERP Frontend Mockup

This frontend is a role-based test harness for StratosERP Phase-I modules.

It includes dedicated sandbox decks for:

- Admin
- HOD
- Class Incharge
- Subject Incharge
- Practical Teacher
- Teacher Guardian
- Student

Each deck provides:

- Workflow summary and KPI mock cards
- Request action cards mapped to backend endpoints
- Editable JSON payloads for POST/PUT calls
- Live response inspector with HTTP status and duration

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

1. Use the "Auth Boot Console" on the home page.
2. Login as faculty or student to obtain and store JWT.
3. Open any role deck and run action cards.
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
