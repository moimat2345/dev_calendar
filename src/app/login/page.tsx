import { LoginButton } from "@/components/LoginButton";

export default function LoginPage() {
  return (
    <div className="min-h-screen grid-bg flex items-center justify-center">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-2xl font-mono font-bold text-neutral-200">
          <span className="text-cyan-400">dev</span>_calendar
        </h1>
        <p className="text-sm text-neutral-500 font-mono">connect your github account to get started</p>
        <LoginButton />
      </div>
    </div>
  );
}
