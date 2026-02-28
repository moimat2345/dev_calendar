import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const body = await request.json();
  const scope: string = body.scope;

  if (!scope) {
    return NextResponse.json({ error: "scope is required" }, { status: 400 });
  }

  if (scope === "all") {
    // Delete all user data: commits (via cascade from projects), activity events, projects
    // Then reset all lastSynced
    await prisma.$transaction([
      prisma.activityEvent.deleteMany({ where: { userId } }),
      prisma.commit.deleteMany({ where: { project: { userId } } }),
      prisma.project.deleteMany({ where: { userId } }),
      prisma.pluginConnection.updateMany({
        where: { userId },
        data: { lastSynced: null },
      }),
    ]);
  } else if (scope === "github") {
    // Delete commits and reset project lastSynced
    await prisma.$transaction([
      prisma.commit.deleteMany({ where: { project: { userId } } }),
      prisma.project.updateMany({
        where: { userId },
        data: { lastSynced: null },
      }),
    ]);
  } else {
    // Plugin-specific wipe (e.g. "spotify")
    await prisma.$transaction([
      prisma.activityEvent.deleteMany({
        where: { userId, pluginId: scope },
      }),
      prisma.pluginConnection.updateMany({
        where: { userId, pluginId: scope },
        data: { lastSynced: null },
      }),
    ]);
  }

  // Invalidate cache
  revalidateTag(`activity-${userId}`, "default");

  return NextResponse.json({ success: true, scope });
}
