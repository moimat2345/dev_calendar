import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/LoginButton";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px]" />

      <div className="relative z-10 text-center space-y-8 px-4">
        <div className="space-y-3">
          <h1 className="text-4xl md:text-6xl font-mono font-bold tracking-tight">
            <span className="text-cyan-400">dev</span>
            <span className="text-neutral-500">_</span>
            <span className="text-neutral-200">calendar</span>
          </h1>
          <p className="text-neutral-500 font-mono text-sm md:text-base max-w-md mx-auto">
            your personal development journal — visualize your git activity like never before
          </p>
        </div>

        <LoginButton />

        <div className="flex items-center gap-6 justify-center text-xs font-mono text-neutral-700">
          <span>github activity</span>
          <span className="text-neutral-800">•</span>
          <span>commit history</span>
          <span className="text-neutral-800">•</span>
          <span>project timeline</span>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
    </div>
  );
}
