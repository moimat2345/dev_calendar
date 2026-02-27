import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const searchParams = request.nextUrl.searchParams;
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  const project = await prisma.project.findUnique({
    where: {
      userId_slug: {
        userId: session.user.id,
        slug,
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const commits = await prisma.commit.findMany({
    where: {
      projectId: project.id,
      day: {
        gte: startDate,
        lt: endDate,
      },
    },
    orderBy: {
      day: "asc",
    },
  });

  // Group by day
  const dayMap = new Map<string, number>();
  for (const commit of commits) {
    dayMap.set(commit.day, (dayMap.get(commit.day) || 0) + 1);
  }

  const days = Array.from(dayMap.entries()).map(([date, count]) => ({
    date,
    commitCount: count,
  }));

  return NextResponse.json({
    project: {
      id: project.id,
      slug: project.slug,
      name: project.name,
      fullName: project.fullName,
      description: project.description,
      remoteUrl: project.remoteUrl,
      lastSynced: project.lastSynced?.toISOString() || null,
    },
    year,
    month,
    days,
  });
}
