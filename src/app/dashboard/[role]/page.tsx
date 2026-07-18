import Link from "next/link";
import { notFound } from "next/navigation";
import RoleWorkspace from "@/components/dashboard/role-workspace";
import { roleBlueprints, roleBySlug, type RoleSlug } from "@/lib/permissions/role-blueprints";

type PageProps = {
  params: Promise<{
    role: RoleSlug;
  }>;
};

export function generateStaticParams() {
  return roleBlueprints.map((role) => ({ role: role.slug }));
}

export default async function DashboardRolePage({ params }: PageProps) {
  const { role } = await params;
  const roleData = roleBySlug[role];

  if (!roleData) {
    notFound();
  }

  return (
    <main className="mono-shell">
      <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="mono-card space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/" className="mono-button-ghost">
                <span aria-hidden="true">←</span>
                Back to launcher
              </Link>
              <span className="mono-pill">{roleData.roleName} workspace</span>
            </div>

            <div className="mono-rule-ultra">
              <h1 className="mono-title max-w-3xl text-5xl sm:text-6xl lg:text-[4.6rem]">{roleData.roleName}</h1>
              <p className="mono-lead mt-5 max-w-3xl">{roleData.strapline}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {roleData.kpis.map((kpi) => (
                <article key={kpi.label} className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent)]">{kpi.label}</p>
                  <p className="mono-title mt-3 text-3xl">{kpi.value}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{kpi.hint}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mono-invert mono-invert-grid p-6 sm:p-8">
            <div className="grid h-full gap-5 sm:grid-cols-2">
              <div className="space-y-4">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-white/70">Control rhythm</p>
                <p className="mono-title text-3xl text-white">Shared dashboard surfaces with role-specific operations.</p>
                <p className="text-sm leading-7 text-white/78">
                  The workspace below keeps one consistent shell while the actions, notices, metrics, and workflows
                  switch by role.
                </p>
              </div>

              <div className="space-y-3 self-end">
                {roleData.checkpoints.slice(0, 3).map((checkpoint) => (
                  <div key={checkpoint} className="rounded-2xl border border-white/14 bg-white/8 p-4 backdrop-blur">
                    <p className="text-sm leading-6 text-white/84">{checkpoint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8">
          <RoleWorkspace role={roleData} />
        </div>
      </div>
    </main>
  );
}
