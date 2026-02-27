import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMonthActivity } from "@/lib/activity";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  const data = await getMonthActivity(session.user.id, year, month);
  return NextResponse.json(data);
}
