import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  ArrowRight,
  Check,
  CircleAlert,
  FileText,
  Loader2,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type { ResumeInfo } from '../../api/types';
import { formatDate } from '../../utils';
import { cn } from '../../utils/cn';
import { StepHeader } from '../StepHeader';
import { Btn, Chip, Mono, Skeleton } from '../ui';

export function StepProfile({
  resume,
  uploading,
  deleting,
  uploadError,
  onUpload,
  onDelete,
  query,
  setQuery,
  location,
  setLocation,
  onNext,
}: {
  resume: ResumeInfo | null;
  uploading: boolean;
  deleting: boolean;
  uploadError: string | null;
  onUpload: (file: File) => void;
  onDelete: () => void;
  query: string;
  setQuery: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  onNext: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (!uploading) {
      setPct(0);
      return undefined;
    }
    setPct(8);
    const id = window.setInterval(() => {
      setPct((current) => (current >= 94 ? 94 : current + Math.max(1, Math.round((100 - current) / 10))));
    }, 240);
    return () => window.clearInterval(id);
  }, [uploading]);

  const error = uploadError ?? localError;

  const choose = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setLocalError('Only text-based PDF files are supported.');
      return;
    }
    setLocalError(null);
    onUpload(file);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    choose(event.target.files?.[0]);
    event.target.value = '';
  };

  const openPicker = () => fileRef.current?.click();

  return (
    <section aria-labelledby="s1-title">
      <StepHeader
        n={1}
        title="Start with your resume."
        sub="Drop a text-based PDF. The Resume Agent extracts your skills and writes a short summary. The file is processed for this anonymous session only."
      />

      {uploading ? (
        <div className="mt-8 rounded-[6px] border-2 border-ink bg-card p-8" role="status" aria-label="Parsing resume">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-semibold">
              <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden="true" />
              Resume Agent is reading…
            </p>
            <Mono className="text-inksoft">{pct}%</Mono>
          </div>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-line/70"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-6 space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-wider text-inksoft">
            {pct < 40 ? 'Reading text layer' : pct < 75 ? 'Extracting skills' : 'Writing summary'}
          </p>
        </div>
      ) : resume ? (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border-2 border-ink bg-card px-5 py-4">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-moss" aria-hidden="true" />
              <div>
                <p className="font-semibold">{resume.filename}</p>
                <Mono className="text-inksoft">
                  Uploaded {formatDate(resume.created_at)} · session-scoped
                </Mono>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="moss">
                <Check className="h-3.5 w-3.5" /> Extraction complete
              </Chip>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[3px] border border-line px-3 text-xs font-medium text-inksoft transition-colors hover:border-err hover:text-err disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[6px] border border-line bg-card p-6">
              <Mono className="text-inksoft">Profile summary</Mono>
              <p className="mt-3 text-[15px] leading-relaxed">
                {resume.facts.summary?.trim() ||
                  'The Resume Agent extracted the skills below from your document. Later steps may only use these grounded facts.'}
              </p>
              <Mono className="mt-5 block text-inksoft">Skills extracted</Mono>
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Extracted skills">
                {resume.facts.skills.length ? (
                  resume.facts.skills.map((skill) => (
                    <li key={skill}>
                      <Chip>{skill}</Chip>
                    </li>
                  ))
                ) : (
                  <li>
                    <Chip tone="amber">No known skills detected</Chip>
                  </li>
                )}
              </ul>
            </div>
            <div className="rounded-[6px] border border-line bg-card p-6">
              <Mono className="text-inksoft">Grounded facts — the only claims agents may use</Mono>
              <dl className="mt-3 divide-y divide-line">
                {[
                  ['Skills', `${resume.facts.skills.length} extracted`],
                  ['File', resume.filename],
                  ['Uploaded', formatDate(resume.created_at)],
                  ['Session', 'Anonymous · scoped'],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_1fr] gap-3 py-2.5">
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-inksoft">
                      {label}
                    </dt>
                    <dd className="text-sm leading-relaxed">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 flex items-start gap-2 rounded-[4px] bg-paper2/70 p-3 text-[12px] leading-relaxed text-inksoft">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-moss" aria-hidden="true" />
                Anything that cannot be traced to this document will not be written into a draft.
              </p>
            </div>
          </div>

          <div className="rounded-[6px] border border-line bg-paper2/70 p-6">
            <h3 className="font-display text-xl font-semibold">Your search, in your words</h3>
            <p className="mt-1 text-sm text-inksoft">
              The Job Agent filters live listings against this. Edit it until it sounds like you.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
              <div>
                <label htmlFor="profile-query" className="text-sm font-medium">
                  Role query
                </label>
                <input
                  id="profile-query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="e.g. frontend engineer, graduate"
                  className="mt-1.5 min-h-[44px] w-full rounded-[3px] border border-linedark bg-card px-3 text-sm focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor="profile-location" className="text-sm font-medium">
                  Location
                </label>
                <input
                  id="profile-location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Anywhere"
                  className="mt-1.5 min-h-[44px] w-full rounded-[3px] border border-linedark bg-card px-3 text-sm focus:border-accent"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-inksoft">
              Profile looks right? The Job Agent takes it from here.
            </p>
            <Btn onClick={onNext} className="min-h-[52px] px-7">
              Find matches <ArrowRight className="h-5 w-5" />
            </Btn>
          </div>
        </div>
      ) : (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload resume PDF"
            onClick={openPicker}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openPicker();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              choose(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              'mt-8 flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[6px] border-2 border-dashed p-8 text-center transition-colors',
              dragOver ? 'border-accent bg-accent/5' : 'border-linedark bg-card hover:border-ink',
            )}
          >
            <UploadCloud className="h-10 w-10 text-inksoft" aria-hidden="true" />
            <p className="font-display text-xl font-semibold">
              Drag your resume here, or click to browse
            </p>
            <p className="text-sm text-inksoft">
              Text-based PDF only · up to 8 MB · processed for this session
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              aria-label="Choose resume PDF"
              onChange={handleChange}
            />
          </div>

          {error ? (
            <div className="mt-6 rounded-[6px] border border-err/50 bg-errbg p-6" role="alert">
              <p className="flex items-center gap-2 font-semibold text-err">
                <CircleAlert className="h-5 w-5" /> That file could not be read.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink">{error}</p>
              <div className="mt-4">
                <Btn variant="ghost" onClick={openPicker}>
                  Choose a different file
                </Btn>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-inksoft">
              The Resume Agent extracts skills and a summary. Job search unlocks once parsing
              finishes.
            </p>
          )}
        </>
      )}
    </section>
  );
}
