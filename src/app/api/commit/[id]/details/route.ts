import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchCommitDetail } from "@/lib/github";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const commit = await prisma.commit.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          user: { select: { id: true, accessToken: true } },
        },
      },
    },
  });

  if (!commit || commit.project.user.id !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If details already fetched, return cached data
  if (commit.detailsFetched) {
    return NextResponse.json({
      filesChanged: commit.filesChanged,
      insertions: commit.insertions,
      deletions: commit.deletions,
      files: commit.files || [],
    });
  }

  // Fetch from GitHub API
  const [owner, repo] = commit.project.fullName.split("/");
  const detail = await fetchCommitDetail(
    commit.project.user.accessToken,
    owner,
    repo,
    commit.hash
  );

  // Cache in DB
  await prisma.commit.update({
    where: { id },
    data: {
      filesChanged: detail.filesChanged,
      insertions: detail.insertions,
      deletions: detail.deletions,
      files: detail.files,
      detailsFetched: true,
    },
  });

  return NextResponse.json({
    filesChanged: detail.filesChanged,
    insertions: detail.insertions,
    deletions: detail.deletions,
    files: detail.files,
  });
}
