import { redirect } from "next/navigation";
import { roleBlueprints, type RoleSlug } from "@/lib/role-blueprints";

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
  redirect(`/portal/${role}`);
}
