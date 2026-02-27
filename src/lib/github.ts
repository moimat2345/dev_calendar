import { Octokit } from "octokit";

export function createOctokit(token: string) {
  return new Octokit({ auth: token });
}

export async function fetchUserRepos(token: string) {
  const octokit = createOctokit(token);
  const repos: any[] = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      per_page: 100,
      page,
      sort: "pushed",
      direction: "desc",
    });

    repos.push(...data);

    if (data.length < 100) break;
    page++;
  }

  return repos.map((repo) => ({
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch || "main",
    owner: repo.owner.login,
  }));
}

export async function fetchCommits(
  token: string,
  owner: string,
  repo: string,
  since?: string
) {
  const octokit = createOctokit(token);
  const commits: any[] = [];
  let page = 1;

  const params: any = {
    owner,
    repo,
    per_page: 100,
    page,
  };

  if (since) {
    params.since = since;
  }

  try {
    while (true) {
      params.page = page;
      const { data } = await octokit.rest.repos.listCommits(params);

      commits.push(...data);

      if (data.length < 100) break;
      page++;

      // Safety limit: max 10 pages (1000 commits) per sync
      if (page > 10) break;
    }
  } catch (error: any) {
    // Handle empty repos or repos with no commits
    if (error.status === 409 || error.status === 404) {
      return [];
    }
    throw error;
  }

  return commits.map((commit) => ({
    hash: commit.sha,
    shortHash: commit.sha.substring(0, 7),
    authorName: commit.commit.author?.name || "Unknown",
    authorEmail: commit.commit.author?.email || "",
    date: commit.commit.author?.date || new Date().toISOString(),
    message: commit.commit.message.split("\n")[0],
    body: commit.commit.message.split("\n").slice(1).join("\n").trim() || null,
    stats: commit.stats
      ? {
          additions: commit.stats.additions || 0,
          deletions: commit.stats.deletions || 0,
          total: commit.stats.total || 0,
        }
      : null,
  }));
}

export async function fetchCommitDetail(
  token: string,
  owner: string,
  repo: string,
  sha: string
) {
  const octokit = createOctokit(token);

  const { data } = await octokit.rest.repos.getCommit({
    owner,
    repo,
    ref: sha,
  });

  return {
    hash: data.sha,
    shortHash: data.sha.substring(0, 7),
    authorName: data.commit.author?.name || "Unknown",
    authorEmail: data.commit.author?.email || "",
    date: data.commit.author?.date || new Date().toISOString(),
    message: data.commit.message.split("\n")[0],
    body: data.commit.message.split("\n").slice(1).join("\n").trim() || null,
    filesChanged: data.files?.length || 0,
    insertions: data.stats?.additions || 0,
    deletions: data.stats?.deletions || 0,
    files:
      data.files?.map((file) => ({
        filename: file.filename,
        status: file.status as string,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
      })) || [],
  };
}
