import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthActivity } from "@/lib/activity";
import { getLocalNow } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const searchParams = request.nextUrl.searchParams;

  // Use user timezone for fallback date
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const now = getLocalNow(user?.timezone || 'UTC');

  const year = parseInt(searchParams.get("year") || now.year.toString());
  const month = parseInt(searchParams.get("month") || now.month.toString());

  const data = await getMonthActivity(userId, year, month);
  return NextResponse.json(data);
}
