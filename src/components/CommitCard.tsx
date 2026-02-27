'use client';

import { useState } from 'react';

interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

interface CommitCardProps {
  id: string;
  shortHash: string;
  message: string;
  body: string | null;
  authorName: string;
  date: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  detailsFetched?: boolean;
  projectSlug?: string;
  projectName?: string;
}

export function CommitCard({
  id, shortHash, message, body, authorName, date,
  filesChanged, insertions, deletions, detailsFetched,
  projectSlug, projectName,
}: CommitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<{
    filesChanged: number;
    insertions: number;
    deletions: number;
    files: FileChange[];
  } | null>(detailsFetched ? { filesChanged, insertions, deletions, files: [] } : null);
  const [loading, setLoading] = useState(false);
  const time = new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const handleExpand = async () => {
    const willExpand = !expanded;
    setExpanded(willExpand);

    if (willExpand && !details) {
      setLoading(true);
      try {
        const res = await fetch(`/api/commit/${id}/details`);
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
  };

  const displayIns = details?.insertions ?? insertions;
  const displayDel = details?.deletions ?? deletions;
  const displayFiles = details?.filesChanged ?? filesChanged;
  const hasStats = displayIns > 0 || displayDel > 0 || displayFiles > 0;

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden transition-all duration-200 hover:border-white/10">
      <button
        onClick={handleExpand}
        className="w-full text-left p-3 flex items-start gap-3"
      >
        <div className="flex-shrink-0 mt-0.5">
          <span className="text-[10px] font-mono text-cyan-500/70 bg-cyan-950/40 px-1.5 py-0.5 rounded">
            {shortHash}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-200 font-mono truncate">{message}</p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-neutral-600 font-mono">
            <span>{time}</span>
            <span>{authorName}</span>
            {hasStats && (
              <span className="flex gap-1.5">
                <span className="text-emerald-600">+{displayIns}</span>
                <span className="text-red-500">-{displayDel}</span>
              </span>
            )}
            {!detailsFetched && !details && (
              <span className="text-neutral-700 italic">click to load stats</span>
            )}
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-neutral-600 transition-transform duration-200 flex-shrink-0 mt-1 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-white/5">
          {body && (
            <pre className="text-xs text-neutral-500 font-mono whitespace-pre-wrap mt-2 leading-relaxed">
              {body}
            </pre>
          )}

          {loading && (
            <div className="mt-2 flex items-center gap-2 text-xs font-mono text-neutral-600">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading file changes...
            </div>
          )}

          {details && details.files.length > 0 && (
            <div className="mt-2 space-y-0.5">
              <div className="text-[10px] font-mono text-neutral-600 mb-1">
                {details.filesChanged} file{details.filesChanged !== 1 ? 's' : ''} changed
                <span className="text-emerald-600 ml-2">+{details.insertions}</span>
                <span className="text-red-500 ml-1">-{details.deletions}</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {details.files.map((file) => (
                  <div key={file.filename} className="flex items-center gap-2 text-[11px] font-mono py-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      file.status === 'added' ? 'bg-emerald-500' :
                      file.status === 'removed' ? 'bg-red-500' :
                      file.status === 'renamed' ? 'bg-blue-500' :
                      'bg-amber-500'
                    }`} />
                    <span className="text-neutral-400 truncate flex-1">{file.filename}</span>
                    <span className="flex gap-1.5 flex-shrink-0 text-[10px]">
                      {file.additions > 0 && <span className="text-emerald-600">+{file.additions}</span>}
                      {file.deletions > 0 && <span className="text-red-500">-{file.deletions}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {details && details.files.length === 0 && !loading && (
            <div className="mt-2 text-xs font-mono text-neutral-600">
              {details.filesChanged} file{details.filesChanged !== 1 ? 's' : ''} changed
              <span className="text-emerald-600 ml-2">+{details.insertions}</span>
              <span className="text-red-500 ml-1">-{details.deletions}</span>
            </div>
          )}

          {projectSlug && projectName && (
            <a
              href={`/dashboard/project/${projectSlug}`}
              className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-mono text-cyan-500/60 hover:text-cyan-400 transition-colors"
            >
              <span>&rarr;</span>
              <span>{projectName} calendar</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
