import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      _count: {
        select: { commits: true },
      },
    },
    orderBy: {
      lastSynced: "desc",
    },
  });

  return NextResponse.json(
    projects.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      fullName: p.fullName,
      description: p.description,
      remoteUrl: p.remoteUrl,
      defaultBranch: p.defaultBranch,
      lastSynced: p.lastSynced?.toISOString() || null,
      commitCount: p._count.commits,
    }))
  );
}
