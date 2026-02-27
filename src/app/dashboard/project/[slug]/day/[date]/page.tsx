import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommitCard } from "@/components/CommitCard";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProjectDayPage({
  params,
}: {
  params: Promise<{ slug: string; date: string }>;
}) {
  const { slug, date } = await params;
  const session = await auth();
  const userId = session?.user?.id as string;

  const project = await prisma.project.findUnique({
    where: { userId_slug: { userId, slug } },
  });

  if (!project) notFound();

  const commits = await prisma.commit.findMany({
    where: { projectId: project.id, day: date },
    orderBy: { date: 'desc' },
  });

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-600">
          <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">calendar</Link>
          <span>/</span>
          <Link href={`/dashboard/project/${slug}`} className="hover:text-cyan-400 transition-colors">{project.name}</Link>
          <span>/</span>
          <span className="text-neutral-500">{date}</span>
        </div>
        <h1 className="text-xl font-mono font-bold text-neutral-200 mt-2">{displayDate}</h1>
        <p className="text-xs font-mono text-neutral-600 mt-1">
          {commits.length} commit{commits.length !== 1 ? 's' : ''} on {project.name}
        </p>
      </div>

      <div className="space-y-2">
        {commits.map(commit => (
          <CommitCard
            key={commit.id}
            id={commit.id}
            shortHash={commit.shortHash}
            message={commit.message}
            body={commit.body}
            authorName={commit.authorName}
            date={commit.date.toISOString()}
            filesChanged={commit.filesChanged}
            insertions={commit.insertions}
            deletions={commit.deletions}
            detailsFetched={commit.detailsFetched}
          />
        ))}
      </div>
    </div>
  );
}
