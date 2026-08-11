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
        <section className="mono-card space-y-6">
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
        </section>

        <div className="mt-8">
          <RoleWorkspace role={roleData} />
        </div>
      </div>
    </main>
  );
}
