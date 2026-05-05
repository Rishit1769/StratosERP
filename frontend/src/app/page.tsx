import Link from "next/link";
import AuthWorkbench from "@/components/auth-workbench";
import { roleBlueprints } from "@/lib/role-blueprints";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass rounded-3xl p-6 shadow-[0_22px_68px_rgba(15,23,42,0.18)] sm:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">StratosERP</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
          Phase-I Frontend Mockup with Role-Based Test Decks
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-700 sm:text-base">
          This Next.js and Tailwind harness gives you a practical command surface for Admin, HOD,
          Class Incharge, Subject Incharge, Practical Teacher, Teacher Guardian, and Student modules.
          Authenticate once, switch roles, and fire real API requests through the in-app proxy.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {roleBlueprints.map((role) => (
            <Link
              key={role.slug}
              href={`/mock/${role.slug}`}
              className="group rounded-2xl border border-zinc-200 bg-white p-4 transition hover:-translate-y-1 hover:border-zinc-400 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]"
            >
              <p className="text-sm font-semibold text-zinc-900">{role.roleName}</p>
              <p className="mt-2 text-xs text-zinc-600">{role.strapline}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-zinc-400 group-hover:text-zinc-600">
                Open deck
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <AuthWorkbench />
      </div>
    </main>
  );
}
