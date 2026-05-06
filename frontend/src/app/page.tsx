import AuthWorkbench from "@/components/auth-workbench";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[80vh] w-full max-w-7xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl">
        <AuthWorkbench />
      </div>
    </main>
  );
}
