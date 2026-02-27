import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SyncButton } from "@/components/SyncButton";
import { SpotifyConnect } from "@/components/SpotifyConnect";
import { UserNav } from "@/components/UserNav";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;

  return (
    <div className="min-h-screen">
      {/* Nav bar */}
      <nav className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/dashboard" className="font-mono text-sm font-bold text-neutral-300 hover:text-cyan-400 transition-colors">
            <span className="text-cyan-400">dev</span>
            <span className="text-neutral-600">_</span>
            <span>calendar</span>
          </Link>

          <div className="flex items-center gap-3">
            <SpotifyConnect />
            <SyncButton />
            <div className="w-px h-5 bg-white/10" />
            <UserNav
              username={user.username || user.name || 'user'}
              avatarUrl={user.avatarUrl || user.image}
            />
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
