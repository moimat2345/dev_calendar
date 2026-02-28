import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsPage } from "@/components/SettingsPage";

export default async function Settings() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return <SettingsPage />;
}
