import { auth } from "@/lib/auth";
import { getMonthActivity } from "@/lib/activity";
import { Calendar } from "@/components/Calendar";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id as string;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const data = await getMonthActivity(userId, year, month);

  return (
    <div className="space-y-8">
      <Calendar initialYear={year} initialMonth={month} initialDays={data.days} />
    </div>
  );
}
