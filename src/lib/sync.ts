import { prisma } from "./prisma";
import { fetchUserRepos, fetchCommits } from "./github";
import { slugify, getLocalDay } from "./utils";

export async function syncUserData(userId: string) {
  // Get user with access token
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const token = user.accessToken;
  const timezone = user.timezone || 'UTC';
  let newProjectsCount = 0;
  let newCommitsCount = 0;

  // 1. Fetch all repos from GitHub
  const repos = await fetchUserRepos(token);

  // 2. Upsert each repo as a Project
  for (const repo of repos) {
    const slug = slugify(repo.name);

    const existingProject = await prisma.project.findUnique({
      where: {
        userId_slug: {
          userId: user.id,
          slug,
        },
      },
    });

    const project = await prisma.project.upsert({
      where: {
        userId_slug: {
          userId: user.id,
          slug,
        },
      },
      update: {
        description: repo.description,
        remoteUrl: repo.htmlUrl,
        defaultBranch: repo.defaultBranch,
      },
      create: {
        userId: user.id,
        slug,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        remoteUrl: repo.htmlUrl,
        defaultBranch: repo.defaultBranch,
      },
    });

    if (!existingProject) {
      newProjectsCount++;
    }

    // 3. Fetch commits since last sync
    const since = project.lastSynced?.toISOString() || undefined;
    const [owner, repoName] = repo.fullName.split("/");

    const commits = await fetchCommits(token, owner, repoName, since);

    // 4. Insert new commits (skip duplicates)
    for (const commit of commits) {
      const day = getLocalDay(commit.date, timezone);

      try {
        await prisma.commit.create({
          data: {
            projectId: project.id,
            hash: commit.hash,
            shortHash: commit.shortHash,
            authorName: commit.authorName,
            authorEmail: commit.authorEmail,
            date: new Date(commit.date),
            day,
            message: commit.message,
            body: commit.body,
            filesChanged: commit.stats?.total || 0,
            insertions: commit.stats?.additions || 0,
            deletions: commit.stats?.deletions || 0,
          },
        });
        newCommitsCount++;
      } catch (error: any) {
        // Skip duplicate commits (unique constraint violation)
        if (error.code === "P2002") continue;
        throw error;
      }
    }

    // 5. Update lastSynced
    await prisma.project.update({
      where: { id: project.id },
      data: { lastSynced: new Date() },
    });
  }

  return {
    projectsFound: repos.length,
    newProjects: newProjectsCount,
    newCommits: newCommitsCount,
  };
}
