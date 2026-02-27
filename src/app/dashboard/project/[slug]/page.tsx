import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectCalendar } from "@/components/ProjectCalendar";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id as string;

  const project = await prisma.project.findUnique({
    where: { userId_slug: { userId, slug } },
    include: { _count: { select: { commits: true } } },
  });

  if (!project) notFound();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const commits = await prisma.commit.findMany({
    where: { projectId: project.id, day: { gte: startDate, lt: endDate } },
    select: { day: true },
  });

  const dayMap = new Map<string, number>();
  for (const c of commits) {
    dayMap.set(c.day, (dayMap.get(c.day) || 0) + 1);
  }

  const days = Array.from(dayMap.entries()).map(([date, count]) => ({
    date,
    commitCount: count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs font-mono text-neutral-600 hover:text-cyan-400 transition-colors">
          &larr; back to calendar
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-xl font-mono font-bold text-neutral-200">{project.name}</h1>
          <span className="text-xs font-mono text-neutral-600 bg-white/5 px-2 py-0.5 rounded">
            {project._count.commits} commits
          </span>
        </div>
        <p className="text-xs font-mono text-neutral-600 mt-1">{project.fullName}</p>
        {project.description && (
          <p className="text-sm text-neutral-500 mt-2">{project.description}</p>
        )}
      </div>

      <ProjectCalendar slug={slug} initialYear={year} initialMonth={month} initialDays={days} />
    </div>
  );
}
