import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; date: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

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

  const commits = await prisma.commit.findMany({
    where: {
      projectId: project.id,
      day: date,
    },
    orderBy: {
      date: "desc",
    },
  });

  return NextResponse.json({
    project: {
      id: project.id,
      slug: project.slug,
      name: project.name,
      fullName: project.fullName,
      remoteUrl: project.remoteUrl,
    },
    date,
    commits: commits.map((c) => ({
      id: c.id,
      hash: c.hash,
      shortHash: c.shortHash,
      authorName: c.authorName,
      authorEmail: c.authorEmail,
      date: c.date.toISOString(),
      message: c.message,
      body: c.body,
      filesChanged: c.filesChanged,
      insertions: c.insertions,
      deletions: c.deletions,
    })),
  });
}
