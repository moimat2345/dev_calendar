import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllPlugins } from "@/plugins/registry";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      githubId: true,
      avatarUrl: true,
      timezone: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // GitHub stats
  const [projectCount, commitCount, lastGithubSync] = await Promise.all([
    prisma.project.count({ where: { userId } }),
    prisma.commit.count({
      where: { project: { userId } },
    }),
    prisma.project.findFirst({
      where: { userId, lastSynced: { not: null } },
      orderBy: { lastSynced: "desc" },
      select: { lastSynced: true },
    }),
  ]);

  // Plugin connections
  const connections = await prisma.pluginConnection.findMany({
    where: { userId },
    select: {
      pluginId: true,
      enabled: true,
      lastSynced: true,
    },
  });

  // Event counts per plugin
  const eventCounts = await prisma.activityEvent.groupBy({
    by: ["pluginId"],
    where: { userId },
    _count: true,
  });

  const eventCountMap: Record<string, number> = {};
  for (const ec of eventCounts) {
    eventCountMap[ec.pluginId] = ec._count;
  }

  const plugins = getAllPlugins().map((p) => {
    const conn = connections.find((c) => c.pluginId === p.id);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      color: p.color,
      connected: p.id === "github" ? true : !!conn?.enabled,
      lastSynced: p.id === "github" ? lastGithubSync?.lastSynced : conn?.lastSynced,
      eventCount: p.id === "github" ? commitCount : (eventCountMap[p.id] || 0),
    };
  });

  return NextResponse.json({
    profile: {
      username: user.username,
      githubId: user.githubId,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      createdAt: user.createdAt,
    },
    github: {
      projectCount,
      commitCount,
      lastSynced: lastGithubSync?.lastSynced,
    },
    plugins,
  });
}
