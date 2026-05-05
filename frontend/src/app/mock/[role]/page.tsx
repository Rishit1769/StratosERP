import Link from "next/link";
import { notFound } from "next/navigation";
import RoleWorkspace from "@/components/role-workspace";
import { roleBlueprints, roleBySlug, type RoleSlug } from "@/lib/role-blueprints";

type PageProps = {
  params: Promise<{
    role: RoleSlug;
  }>;
};

export function generateStaticParams() {
  return roleBlueprints.map((role) => ({ role: role.slug }));
}

export default async function RolePage({ params }: PageProps) {
  const { role } = await params;
  const roleData = roleBySlug[role];

  if (!roleData) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100"
      >
        Back to role launcher
      </Link>
      <div className="mt-6">
        <RoleWorkspace role={roleData} />
      </div>
    </main>
  );
}
