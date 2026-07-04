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
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mb-10 border-b-4 border-[var(--border)] pb-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link href="/" className="mono-button-ghost">
              <span aria-hidden="true">←</span>
              Back to launcher
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <p className="mono-kicker">{roleData.roleName} workspace</p>
              <h1 className="mono-title mt-3 text-5xl sm:text-6xl">{roleData.roleName}</h1>
              <p className="mono-lead mt-4 max-w-3xl">{roleData.strapline}</p>
            </div>

            <div className="mono-grid mono-card">
              <p className="mono-kicker">Command posture</p>
              <p className="mono-body mt-4">
                Shared monochrome shell, role-routed tools, and hard-edged interaction states across every portal.
              </p>
            </div>
          </div>
        </div>

        <RoleWorkspace role={roleData} />
      </div>
    </main>
  );
}
