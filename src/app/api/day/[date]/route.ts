import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { date } = await params;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  const commits = await prisma.commit.findMany({
    where: {
      project: {
        userId: session.user.id,
      },
      day: date,
    },
    include: {
      project: {
        select: {
          id: true,
          slug: true,
          name: true,
          fullName: true,
          remoteUrl: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  // Group by project
  const projectMap = new Map<
    string,
    {
      project: any;
      commits: any[];
      totalInsertions: number;
      totalDeletions: number;
    }
  >();

  for (const commit of commits) {
    const key = commit.project.slug;
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        project: commit.project,
        commits: [],
        totalInsertions: 0,
        totalDeletions: 0,
      });
    }
    const entry = projectMap.get(key)!;
    entry.commits.push({
      id: commit.id,
      hash: commit.hash,
      shortHash: commit.shortHash,
      authorName: commit.authorName,
      date: commit.date.toISOString(),
      message: commit.message,
      body: commit.body,
      filesChanged: commit.filesChanged,
      insertions: commit.insertions,
      deletions: commit.deletions,
    });
    entry.totalInsertions += commit.insertions;
    entry.totalDeletions += commit.deletions;
  }

  const repos = Array.from(projectMap.values()).map((entry) => ({
    ...entry.project,
    commitCount: entry.commits.length,
    totalInsertions: entry.totalInsertions,
    totalDeletions: entry.totalDeletions,
    commits: entry.commits,
  }));

  // Fetch plugin events for this day
  const events = await prisma.activityEvent.findMany({
    where: {
      userId: session.user.id,
      day: date,
    },
    orderBy: { timestamp: 'desc' },
  });

  // Group events by plugin
  const pluginEvents: Record<string, any[]> = {};
  for (const event of events) {
    if (!pluginEvents[event.pluginId]) {
      pluginEvents[event.pluginId] = [];
    }
    pluginEvents[event.pluginId].push({
      id: event.id,
      type: event.type,
      title: event.title,
      subtitle: event.subtitle,
      timestamp: event.timestamp.toISOString(),
      metadata: event.metadata,
      value: event.value,
    });
  }

  return NextResponse.json({
    date,
    totalCommits: commits.length,
    repos: repos.sort((a, b) => b.commitCount - a.commitCount),
    pluginEvents,
  });
}
