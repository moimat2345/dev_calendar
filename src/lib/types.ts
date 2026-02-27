import type { PluginDaySummary } from '@/plugins/types';

export interface DayActivity {
  date: string;
  totalCommits: number;
  projects: {
    slug: string;
    name: string;
    commitCount: number;
  }[];
  totalWeight?: number;
  sources?: PluginDaySummary[];
}

export interface MonthActivity {
  year: number;
  month: number;
  days: DayActivity[];
}

export interface ProjectDayDetail {
  project: {
    id: string;
    slug: string;
    name: string;
    fullName: string;
    description: string | null;
    remoteUrl: string;
  };
  date: string;
  commits: CommitDetail[];
}

export interface CommitDetail {
  id: string;
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  day: string;
  message: string;
  body: string | null;
  filesChanged: number;
  insertions: number;
  deletions: number;
}
