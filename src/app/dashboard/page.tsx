import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthActivity } from "@/lib/activity";
import { Calendar } from "@/components/Calendar";
import { getLocalNow } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const { year, month } = getLocalNow(user?.timezone || 'UTC');

  const data = await getMonthActivity(userId, year, month);

  return (
    <div className="space-y-8">
      <Calendar initialYear={year} initialMonth={month} initialDays={data.days} />
    </div>
  );
}
