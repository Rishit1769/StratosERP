# Repository Structure

## Folder Tree

```text
/
├── .github/
│   ├── templates/
│   └── workflows/
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── modules/
│   └── workflows/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── assets/
│   ├── icons/
│   ├── images/
│   ├── logos/
│   └── *.svg
├── scripts/
│   ├── database/
│   ├── deployment/
│   ├── maintenance/
│   └── migrations/
├── src/
│   ├── actions/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── admin/
│   │   ├── api/
│   │   ├── dashboard/
│   │   ├── hod/
│   │   ├── mock/
│   │   ├── portal/
│   │   ├── shared/
│   │   ├── student/
│   │   └── teacher/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── forms/
│   │   ├── layouts/
│   │   ├── modals/
│   │   ├── navigation/
│   │   ├── tables/
│   │   └── ui/
│   ├── constants/
│   ├── generated/
│   ├── hooks/
│   ├── lib/
│   │   ├── analytics/
│   │   ├── attendance/
│   │   ├── audit/
│   │   ├── auth/
│   │   ├── email/
│   │   ├── examination/
│   │   ├── exports/
│   │   ├── moderation/
│   │   ├── notifications/
│   │   ├── paper-generation/
│   │   ├── permissions/
│   │   ├── prisma/
│   │   ├── question-bank/
│   │   ├── scheduling/
│   │   ├── storage/
│   │   ├── utils/
│   │   └── validation/
│   ├── middleware/
│   ├── services/
│   ├── types/
│   └── constants/
├── AGENTS.md
├── CLAUDE.md
├── Dockerfile
├── README.md
├── docker-compose.yml
└── package.json
```

## Purpose By Area

- `docs/architecture`
  Holds system-level references such as diagrams and structural decisions.

- `docs/workflows`
  Stores role and process documentation for Admin, HOD, TG, Student, and related flows.

- `docs/modules`
  Reserved for module-specific design and product notes.

- `docs/api`
  Reserved for API contracts, route notes, payload examples, and integration guides.

- `prisma/`
  The only place for Prisma schema, migrations, and seed logic.

- `public/`
  Static assets served directly by Next.js. Group reusable media by intent.

- `scripts/database`
  Database bootstrap and raw SQL references that are not Prisma migrations.

- `scripts/migrations`
  Legacy SQL migration artifacts and operational migration helpers.

- `scripts/maintenance`
  Operational support scripts such as smoke tests and maintenance utilities.

- `src/app`
  Route layer only. Pages and route handlers must stay thin and delegate logic.

- `src/components`
  Reusable UI primitives and feature-facing presentation components.

- `src/lib`
  Shared framework-agnostic logic, helpers, adapters, policy code, and infrastructure utilities.

- `src/services`
  Business workflows and domain operations. Route handlers call into this layer.

- `src/middleware`
  Shared request authorization and request-processing helpers.

- `src/types`
  Cross-cutting application types and API payload typing.

- `src/constants`
  Centralized enums, labels, and shared constant maps.

- `src/generated`
  Reserved for generated code only.

## Architectural Conventions

- This repository is a single Next.js application.
  No `apps/web`, no `apps/api`, no workspaces, and no monorepo orchestration.

- `src/app` is the delivery layer.
  Pages render UI and route handlers return HTTP responses, but domain logic lives elsewhere.

- Business logic belongs in `src/services` and `src/lib`.
  If logic can be reused by more than one route or page, it should not live in `page.tsx`.

- Prisma access belongs in `src/lib/prisma` and `prisma/`.
  Do not instantiate ad-hoc Prisma clients outside that boundary.

- Auth and permission logic belongs in `src/lib/auth` and `src/lib/permissions`.

- Storage, notification, AI, and integration adapters belong under `src/lib/*`.

- Components should be grouped by responsibility.
  Generic primitives go in `components/ui`; feature widgets go in folders like `dashboard/` or `forms/`.

- Backward compatibility routes may exist during transitions.
  For example, `/portal/*` can redirect to `/dashboard/*` while consumers are updated.

## Rules For Future Development

- Keep pages thin.
  Page files should compose components and call actions/services instead of embedding business rules.

- Add new API behavior under `src/app/api` and delegate to `src/services`.

- Add shared helpers to `src/lib`, not inside route folders.

- Add reusable presentation to `src/components`, not inline in pages.

- Keep database schema, migrations, and seed changes inside `prisma/`.

- Keep docs close to architecture decisions.
  New module docs go to `docs/modules`; role or process flows go to `docs/workflows`.

- Avoid introducing a second application boundary.
  Do not reintroduce `apps/`, `packages/`, Turborepo, Nx, or workspace packaging.

- Prefer redirects over duplicate route logic when preserving old URLs.

- Keep import paths rooted at `@/` for app code to avoid fragile relative chains.
