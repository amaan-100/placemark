import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, Clock3, GripVertical, Loader2, MessageSquareText, X } from 'lucide-react';
import { ApiError, api, getSessionId } from '../api/client';
import type {
  Application,
  ApplicationUpdate,
  Dashboard,
  InterviewAnswerResponse,
  InterviewDetailResponse,
  InterviewStart,
  InterviewSummaryOut,
  InterviewTurnOut,
  Job,
  LlmStatus,
  ResumeInfo,
  Trace,
} from '../api/types';
import { AGENT_META } from '../lib/agents';
import { defaultQueryFromSkills } from '../lib/roles';
import { STEPS, type Step } from '../lib/steps';
import { cn } from '../utils/cn';
import { ApprovalDialog } from './ApprovalDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { StepApprove } from './steps/StepApprove';
import { StepMatches } from './steps/StepMatches';
import { StepPractice } from './steps/StepPractice';
import { StepProfile } from './steps/StepProfile';
import { Toast } from './Toast';
import type { ToastKind, ToastMessage } from './Toast';
import { TraceRail } from './TraceRail';
import { Btn, EASE, Mono } from './ui';

const EMPTY_DASHBOARD: Dashboard = {
  applications: 0,
  pending_approvals: 0,
  approved: 0,
  interviews: 0,
};

function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Try again.';
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-inksoft">{label}</dt>
      <dd className="font-mono text-base font-semibold">{value}</dd>
    </div>
  );
}

function SessionClock() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(
    elapsed % 60,
  ).padStart(2, '0')}`;

  return (
    <span
      className="hidden items-center gap-1.5 font-mono text-xs text-inksoft md:inline-flex"
      aria-label={`Session elapsed ${mmss}`}
    >
      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {mmss}
    </span>
  );
}

export function Workspace({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [llmStatus, setLlmStatus] = useState<LlmStatus | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard>(EMPTY_DASHBOARD);
  const [resume, setResume] = useState<ResumeInfo | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [tracesLoading, setTracesLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsSource, setJobsSource] = useState('');
  const [jobsCached, setJobsCached] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [draftingJobId, setDraftingJobId] = useState<number | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<Application | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [approving, setApproving] = useState(false);
  const [deletingApplicationId, setDeletingApplicationId] = useState<number | null>(null);
  const [interview, setInterview] = useState<InterviewStart | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<InterviewAnswerResponse | null>(null);
  const [turns, setTurns] = useState<InterviewTurnOut[]>([]);
  const [weakAreas, setWeakAreas] = useState<string[]>([]);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [startingInterview, setStartingInterview] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [interviewHistory, setInterviewHistory] = useState<InterviewSummaryOut[]>([]);
  const [expandedInterviewId, setExpandedInterviewId] = useState<number | null>(null);
  const [interviewDetails, setInterviewDetails] = useState<
    Record<number, InterviewDetailResponse>
  >({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingResume, setDeletingResume] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [traceOpen, setTraceOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Application | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [llmFailed, setLlmFailed] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [showWakeNotice, setShowWakeNotice] = useState(false);
  const [sessionId] = useState(() => getSessionId());
  const tracePanelRef = useRef<HTMLDivElement>(null);
  const firstStepRender = useRef(true);
  const traceDragControls = useDragControls();
  const reduce = useReducedMotion();

  const notify = useCallback((kind: ToastKind, text: string) => {
    setToast({ kind, text });
  }, []);

  const handleLoadError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 0) {
      setApiOnline(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      setDashboard(await api.getDashboard());
      setApiOnline(true);
    } catch (error) {
      handleLoadError(error);
    }
  }, [handleLoadError]);

  const refreshApplications = useCallback(async () => {
    try {
      const result = await api.getApplications();
      setApplications(result.applications);
    } catch (error) {
      handleLoadError(error);
    }
  }, [handleLoadError]);

  const refreshTraces = useCallback(async () => {
    setTracesLoading(true);
    try {
      setTraces(await api.getTraces());
    } catch (error) {
      handleLoadError(error);
    } finally {
      setTracesLoading(false);
    }
  }, [handleLoadError]);

  const refreshLatestResume = useCallback(async () => {
    try {
      setResume(await api.getLatestResume());
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setResume(null);
        return;
      }
      handleLoadError(error);
    }
  }, [handleLoadError]);

  const refreshInterviews = useCallback(async () => {
    try {
      const result = await api.listInterviews();
      setInterviewHistory(result.interviews);
    } catch (error) {
      handleLoadError(error);
    }
  }, [handleLoadError]);

  const retryConnection = useCallback(async () => {
    setReconnecting(true);
    try {
      await api.getHealth();
      setApiOnline(true);
      await Promise.all([
        refreshDashboard(),
        refreshApplications(),
        refreshTraces(),
        refreshLatestResume(),
        refreshInterviews(),
      ]);
      const status = await api.getLlmStatus().catch(() => null);
      setLlmStatus(status);
      setLlmFailed(status === null);
    } catch {
      setApiOnline(false);
    } finally {
      setReconnecting(false);
    }
  }, [
    refreshApplications,
    refreshDashboard,
    refreshInterviews,
    refreshLatestResume,
    refreshTraces,
  ]);

  useEffect(() => {
    let active = true;
    api
      .getHealth()
      .then(() => {
        if (active) {
          setApiOnline(true);
        }
      })
      .catch(() => {
        if (active) {
          setApiOnline(false);
        }
      });

    void refreshDashboard();
    void refreshApplications();
    void refreshTraces();
    void refreshLatestResume();
    void refreshInterviews();
    api
      .getLlmStatus()
      .then((status) => {
        if (active) {
          setLlmStatus(status);
          setLlmFailed(false);
        }
      })
      .catch(() => {
        if (active) {
          setLlmStatus(null);
          setLlmFailed(true);
        }
      });

    return () => {
      active = false;
    };
  }, [
    refreshApplications,
    refreshDashboard,
    refreshInterviews,
    refreshLatestResume,
    refreshTraces,
  ]);

  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return undefined;
    }
    const timer = window.setTimeout(
      () => document.getElementById(`s${step}-title`)?.focus(),
      reduce ? 0 : 420,
    );
    return () => window.clearTimeout(timer);
  }, [step, reduce]);

  useEffect(() => {
    if (!traceOpen) {
      return undefined;
    }
    const previous = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => tracePanelRef.current?.focus(), 60);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setTraceOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !tracePanelRef.current) {
        return;
      }
      const focusable = tracePanelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
        event.preventDefault();
        tracePanelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [traceOpen]);

  const apiBusy = uploading || deletingResume || tracesLoading || apiOnline === null;

  useEffect(() => {
    if (!apiBusy) {
      setShowWakeNotice(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setShowWakeNotice(true), 3_000);
    return () => window.clearTimeout(timer);
  }, [apiBusy]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError(null);
      try {
        const uploaded = await api.uploadResume(file);
        setResume({
          id: uploaded.resume_id,
          filename: uploaded.filename,
          facts: uploaded.facts,
          created_at: uploaded.created_at,
        });
        setApiOnline(true);
        setJobs([]);
        setSearched(false);
        setSelectedJob(null);
        notify('success', `Resume analyzed. ${uploaded.facts.skills.length} skills detected.`);
        setQuery((current) => (current.trim() ? current : defaultQueryFromSkills(uploaded.facts.skills)));
        await Promise.all([refreshDashboard(), refreshTraces()]);
      } catch (error) {
        handleLoadError(error);
        setUploadError(errorText(error));
        notify('error', errorText(error));
      } finally {
        setUploading(false);
      }
    },
    [handleLoadError, notify, refreshDashboard, refreshTraces],
  );

  const handleDeleteResume = useCallback(async () => {
    setDeletingResume(true);
    try {
      const result = await api.deleteResume();
      setResume(null);
      setLocation('');
      setJobs([]);
      setSearched(false);
      setSelectedJob(null);
      setApprovalTarget(null);
      notify(
        'success',
        result.deleted ? 'Resume removed from this session.' : 'No resume was stored.',
      );
      await Promise.all([refreshDashboard(), refreshTraces()]);
    } catch (error) {
      handleLoadError(error);
      notify('error', errorText(error));
    } finally {
      setDeletingResume(false);
    }
  }, [handleLoadError, notify, refreshDashboard, refreshTraces]);

  const handleSaveDraft = useCallback(
    async (draft: ApplicationUpdate): Promise<Application | null> => {
      if (!approvalTarget) {
        return null;
      }
      const wasApproved = approvalTarget.status === 'APPROVED';
      setSavingDraft(true);
      try {
        const updated = await api.updateApplication(approvalTarget.id, draft);
        const approvalReset = wasApproved && updated.status === 'PENDING_APPROVAL';
        setApprovalTarget(updated);
        notify(
          'success',
          approvalReset
            ? 'Draft updated. Approval reset; review and approve again.'
            : 'Draft changes saved.',
        );
        await Promise.all([refreshApplications(), refreshDashboard()]);
        return updated;
      } catch (error) {
        handleLoadError(error);
        notify('error', errorText(error));
        return null;
      } finally {
        setSavingDraft(false);
      }
    },
    [approvalTarget, handleLoadError, notify, refreshApplications, refreshDashboard],
  );

  const handleApprove = useCallback(
    async (draft: ApplicationUpdate): Promise<boolean> => {
      if (!approvalTarget) {
        return false;
      }
      setApproving(true);
      try {
        const edited =
          draft.cover_note !== approvalTarget.cover_note ||
          draft.resume_draft !== approvalTarget.resume_draft;
        let current = approvalTarget;
        if (edited) {
          current = await api.updateApplication(approvalTarget.id, draft);
          setApprovalTarget(current);
        }
        const result = await api.approveApplication(current.id);
        notify('success', result.message);
        setApprovalTarget(null);
        if (current.status !== 'APPROVED') {
          setApplications((previous) =>
            previous.map((application) =>
              application.id === current.id
                ? { ...application, status: result.status, updated_at: new Date().toISOString() }
                : application,
            ),
          );
          setDashboard((previous) => ({
            ...previous,
            pending_approvals: Math.max(0, previous.pending_approvals - 1),
            approved: previous.approved + 1,
          }));
        }
        await Promise.all([refreshApplications(), refreshDashboard(), refreshTraces()]);
        return true;
      } catch (error) {
        handleLoadError(error);
        notify('error', errorText(error));
        return false;
      } finally {
        setApproving(false);
      }
    },
    [
      approvalTarget,
      handleLoadError,
      notify,
      refreshApplications,
      refreshDashboard,
      refreshTraces,
    ],
  );

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      notify('info', 'Enter a role to search for first.');
      return;
    }
    setSearching(true);
    setSearched(true);
    try {
      const result = await api.searchJobs(trimmed, location.trim());
      setJobs(result.jobs);
      setJobsSource(result.source);
      setJobsCached(result.cached);
      setApiOnline(true);
      if (result.jobs.length === 0) {
        notify('info', 'No listings matched that search. Try a broader query.');
      } else {
        notify('success', `${result.jobs.length} roles ranked against your resume.`);
      }
      await refreshTraces();
    } catch (error) {
      handleLoadError(error);
      notify('error', errorText(error));
    } finally {
      setSearching(false);
    }
  }, [handleLoadError, location, notify, query, refreshTraces]);

  const handleDraft = useCallback(
    async (job: Job) => {
      if (!resume) {
        notify('error', 'Upload a resume before drafting.');
        return;
      }
      setSelectedJob(job);
      setDraftingJobId(job.id);
      try {
        await api.draftApplication(job.id);
        notify('success', `Draft created for ${job.title}. Review it before approving.`);
        await Promise.all([refreshApplications(), refreshDashboard(), refreshTraces()]);
        setStep(3);
      } catch (error) {
        handleLoadError(error);
        notify('error', errorText(error));
      } finally {
        setDraftingJobId(null);
      }
    },
    [handleLoadError, notify, refreshApplications, refreshDashboard, refreshTraces, resume],
  );

  const handleOpenApplication = useCallback(
    (application: Application) => {
      const job = jobs.find((item) => item.id === application.job_id) ?? null;
      if (job) {
        setSelectedJob(job);
      }
      setApprovalTarget(application);
    },
    [jobs],
  );

  const removeApplication = useCallback(
    async (application: Application) => {
      setConfirmBusy(true);
      setDeletingApplicationId(application.id);
      try {
        await api.deleteApplication(application.id);
        if (approvalTarget?.id === application.id) {
          setApprovalTarget(null);
        }
        setApplications((previous) =>
          previous.filter((item) => item.id !== application.id),
        );
        notify('success', `Deleted the draft for ${application.title}.`);
        await Promise.all([refreshApplications(), refreshDashboard(), refreshTraces()]);
      } catch (error) {
        handleLoadError(error);
        notify('error', errorText(error));
      } finally {
        setDeletingApplicationId(null);
        setConfirmBusy(false);
        setPendingDelete(null);
      }
    },
    [
      approvalTarget,
      handleLoadError,
      notify,
      refreshApplications,
      refreshDashboard,
      refreshTraces,
    ],
  );

  const handleDeleteApplication = useCallback((application: Application) => {
    setPendingDelete(application);
  }, []);

  const handleStartInterview = useCallback(async () => {
    const goal = selectedJob
      ? `${selectedJob.title} at ${selectedJob.company}`
      : query.trim();
    if (!goal) {
      notify('info', 'Pick a role in Step 02 before starting practice.');
      return;
    }
    setStartingInterview(true);
    try {
      const started = await api.startInterview(goal);
      setInterview(started);
      setCurrentQuestion(started.question);
      setAnswer('');
      setEvaluation(null);
      setTurns([]);
      setWeakAreas([]);
      setInterviewComplete(false);
      notify('info', 'Interview question ready.');
      await Promise.all([refreshDashboard(), refreshTraces(), refreshInterviews()]);
    } catch (error) {
      handleLoadError(error);
      notify('error', errorText(error));
    } finally {
      setStartingInterview(false);
    }
  }, [
    handleLoadError,
    notify,
    query,
    refreshDashboard,
    refreshInterviews,
    refreshTraces,
    selectedJob,
  ]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!interview || !currentQuestion) {
      return;
    }
    setEvaluating(true);
    try {
      const result = await api.submitInterviewAnswer(
        interview.interview_id,
        answer.trim(),
      );
      setEvaluation(result);
      const updated = await api.getInterview(interview.interview_id);
      setTurns(updated.turns);
      setWeakAreas(updated.weak_areas);
      setAnswer('');
      setCurrentQuestion(result.next_question ?? null);
      if (result.status === 'COMPLETE') {
        setInterviewComplete(true);
        notify('success', `Practice set complete — ${result.score}/100.`);
      } else {
        notify('success', `Answer scored ${result.score}/100.`);
      }
      await Promise.all([refreshDashboard(), refreshTraces(), refreshInterviews()]);
    } catch (error) {
      handleLoadError(error);
      notify('error', errorText(error));
    } finally {
      setEvaluating(false);
    }
  }, [
    answer,
    currentQuestion,
    handleLoadError,
    interview,
    notify,
    refreshDashboard,
    refreshInterviews,
    refreshTraces,
  ]);

  const handleToggleHistory = useCallback(
    async (id: number) => {
      if (expandedInterviewId === id) {
        setExpandedInterviewId(null);
        return;
      }
      setExpandedInterviewId(id);
      if (interviewDetails[id]) {
        return;
      }
      try {
        const detail = await api.getInterview(id);
        setInterviewDetails((previous) => ({ ...previous, [id]: detail }));
      } catch (error) {
        handleLoadError(error);
        notify('error', 'Could not load interview details.');
      }
    },
    [expandedInterviewId, handleLoadError, interviewDetails, notify],
  );

  const closeApproval = useCallback(() => setApprovalTarget(null), []);

  const fallback = llmStatus !== null && !llmStatus.available;
  const pendingApprovals = applications.filter(
    (application) => application.status === 'PENDING_APPROVAL',
  ).length;
  const selectedApplication = useMemo<Application | null>(
    () =>
      selectedJob
        ? (applications.find((application) => application.job_id === selectedJob.id) ?? null)
        : null,
    [applications, selectedJob],
  );

  const stepStatus = (n: Step): 'done' | 'current' | 'todo' => {
    if (n === step) {
      return 'current';
    }
    if (n === 1 && resume) {
      return 'done';
    }
    if (n === 2 && selectedJob) {
      return 'done';
    }
    if (n === 3 && selectedApplication?.status === 'APPROVED') {
      return 'done';
    }
    return 'todo';
  };

  const practiceDirty = interview !== null && !interviewComplete;
  const hasTypedAnswer = answer.trim().length > 0;
  const handleExit = () => {
    if (practiceDirty || hasTypedAnswer) {
      setConfirmExit(true);
      return;
    }
    onExit();
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-[3px] focus:border-2 focus:border-ink focus:bg-card focus:px-4 focus:py-3 focus:text-sm focus:font-semibold"
      >
        Skip to workspace
      </a>
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExit}
              className="flex h-11 w-11 items-center justify-center rounded-[3px] border border-line hover:border-ink hover:bg-paper2"
              aria-label="Back to overview"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="leading-none">
              <p className="font-display text-lg font-bold tracking-tight">Placemark</p>
              <Mono className="mt-0.5 text-inksoft">
                {sessionId.slice(0, 8).toUpperCase()} · Anonymous
              </Mono>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <SessionClock />
            <span
              className={cn(
                'hidden items-center gap-1.5 rounded-[3px] border px-3 py-2 font-mono text-[10px] uppercase tracking-wider sm:inline-flex',
                llmStatus === null
                  ? 'border-line bg-paper2 text-inksoft'
                  : fallback
                    ? 'border-amber/50 bg-amberbg text-amber'
                    : 'border-moss/40 bg-mossbg text-moss',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  llmStatus === null ? 'bg-linedark' : fallback ? 'bg-amber' : 'bg-moss',
                )}
                aria-hidden="true"
              />
              {llmStatus === null
                ? llmFailed
                  ? 'AI status unknown'
                  : 'Checking AI'
                : fallback
                  ? 'Fallback mode'
                  : 'AI-assisted'}
            </span>
            <button
              onClick={() => setTraceOpen((open) => !open)}
              className="flex min-h-[44px] items-center gap-2 rounded-[3px] border border-line bg-card px-3 text-xs font-medium transition-colors hover:border-ink hover:bg-paper2"
              aria-expanded={traceOpen}
              aria-controls="trace-panel"
              aria-label={traceOpen ? 'Hide agent trace' : 'Show agent trace'}
            >
              {traceOpen ? <X className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
              <span className="hidden sm:inline">Trace</span>
            </button>
          </div>
        </div>
        {showWakeNotice ? (
          <div className="border-t border-line bg-paper2 px-4 py-2 sm:px-6 lg:px-10" role="status">
            <p className="mx-auto flex max-w-[1600px] items-center gap-2 text-[13px] font-medium text-inksoft">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber" aria-hidden="true" />
              Waking the workspace. The first request after idle can take up to a minute.
            </p>
          </div>
        ) : null}
        {fallback ? (
          <div className="border-t border-amber/40 bg-amberbg px-4 py-2 sm:px-6 lg:px-10" role="status">
            <p className="mx-auto max-w-[1600px] text-[13px] font-medium text-amber">
              AI is unavailable. You are in fallback mode — deterministic templates carry every
              step, and the trace marks each fallback action. Nothing about your control changes.
            </p>
          </div>
        ) : null}
        {apiOnline === false ? (
          <div className="border-t border-err/40 bg-errbg px-4 py-2 sm:px-6 lg:px-10" role="alert">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-err">
                The workspace cannot reach the API. Your session is safe — retry when the
                connection is back.
              </p>
              <Btn
                variant="ghost"
                onClick={() => void retryConnection()}
                disabled={reconnecting}
                className="min-h-[36px] px-3 text-xs"
              >
                {reconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : null}
                {reconnecting ? 'Retrying…' : 'Retry connection'}
              </Btn>
            </div>
          </div>
        ) : null}
      </header>

      <div
        inert={traceOpen}
        className="mx-auto grid w-full min-w-0 max-w-[1600px] flex-1 xl:grid-cols-[280px_minmax(0,1fr)]"
      >
        <nav
          aria-label="Placement steps"
          className="min-w-0 border-b border-line xl:border-b-0 xl:border-r"
        >
          <ol className="flex gap-1 overflow-x-auto p-3 xl:flex-col xl:gap-0 xl:p-0">
            {STEPS.map((item) => {
              const status = stepStatus(item.n);
              const active = step === item.n;
              return (
                <li key={item.n} className="shrink-0 xl:shrink">
                  <button
                    onClick={() => setStep(item.n)}
                    aria-current={active ? 'step' : undefined}
                    aria-label={`Step 0${item.n}: ${item.name}${
                      status === 'done' ? ' (complete)' : ''
                    }`}
                    className={cn(
                      'flex min-h-[56px] w-full items-center gap-3 rounded-[3px] px-3 py-3 text-left transition-colors xl:rounded-none xl:border-l-4 xl:px-5',
                      active
                        ? 'bg-card xl:border-accent'
                        : 'xl:border-transparent hover:bg-paper2/70',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs font-semibold',
                        status === 'done'
                          ? 'border-moss bg-moss text-white'
                          : active
                            ? 'border-accent bg-accentdark text-white'
                            : 'border-linedark text-inksoft',
                      )}
                    >
                      {status === 'done' ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        `0${item.n}`
                      )}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block text-sm font-semibold',
                          active ? 'text-ink' : 'text-inksoft',
                        )}
                      >
                        {item.name}
                      </span>
                      <span className="hidden truncate text-[11px] text-inksoft sm:block">
                        {AGENT_META[item.agent].short} agent
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="hidden border-t border-line p-5 xl:block">
            <Mono className="text-inksoft">This session</Mono>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
              <Stat label="Applications" value={dashboard.applications} />
              <Stat label="Pending" value={dashboard.pending_approvals} />
              <Stat label="Approved" value={dashboard.approved} />
              <Stat label="Interviews" value={dashboard.interviews} />
            </dl>
            <Mono className="mt-5 block text-inksoft">Session status</Mono>
            <dl className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-inksoft">Mode</dt>
                <dd className="font-mono font-medium">
                  {fallback
                    ? 'FALLBACK'
                    : llmStatus === null
                      ? llmFailed
                        ? 'UNKNOWN'
                        : 'CHECKING'
                      : 'AI-ASSISTED'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-inksoft">Resume</dt>
                <dd className="font-mono font-medium">{resume ? 'PARSED' : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-inksoft">Role</dt>
                <dd className="font-mono font-medium">{selectedJob ? 'SELECTED' : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-inksoft">Draft</dt>
                <dd className="font-mono font-medium">
                  {selectedApplication
                    ? selectedApplication.status === 'APPROVED'
                      ? 'APPROVED'
                      : 'PENDING'
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-inksoft">Queue</dt>
                <dd className="font-mono font-medium">{pendingApprovals}</dd>
              </div>
            </dl>
          </div>
        </nav>

        <main
          id="workspace-main"
          tabIndex={-1}
          className="min-w-0 px-4 py-6 focus:outline-none sm:px-6 xl:px-10 xl:py-10"
        >
          <p className="sr-only" aria-live="polite">
            Step 0{step} — {STEPS[step - 1].name}
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              {step === 1 && (
                <StepProfile
                  resume={resume}
                  uploading={uploading}
                  deleting={deletingResume}
                  uploadError={uploadError}
                  onUpload={handleUpload}
                  onDelete={handleDeleteResume}
                  query={query}
                  setQuery={setQuery}
                  location={location}
                  setLocation={setLocation}
                  onNext={() => setStep(2)}
                />
              )}
              {step === 2 && (
                <StepMatches
                  hasResume={resume !== null}
                  searching={searching}
                  searched={searched}
                  query={query}
                  setQuery={setQuery}
                  location={location}
                  setLocation={setLocation}
                  jobs={jobs}
                  source={jobsSource}
                  cached={jobsCached}
                  selected={selectedJob}
                  onPick={setSelectedJob}
                  onSearch={handleSearch}
                  onDraft={handleDraft}
                  draftingJobId={draftingJobId}
                  fallback={fallback}
                  onBack={() => setStep(1)}
                  onNext={() => setStep(3)}
                />
              )}
              {step === 3 && (
                <StepApprove
                  selectedJob={selectedJob}
                  application={selectedApplication}
                  applications={applications}
                  drafting={draftingJobId !== null && draftingJobId === selectedJob?.id}
                  deletingId={deletingApplicationId}
                  fallback={fallback}
                  onDraft={() => {
                    if (selectedJob) {
                      void handleDraft(selectedJob);
                    }
                  }}
                  onReview={() => {
                    if (selectedApplication) {
                      setApprovalTarget(selectedApplication);
                    }
                  }}
                  onOpen={handleOpenApplication}
                  onDelete={handleDeleteApplication}
                  onBack={() => setStep(2)}
                  onNext={() => setStep(4)}
                />
              )}
              {step === 4 && (
                <StepPractice
                  approved={selectedApplication?.status === 'APPROVED'}
                  selectedJob={selectedJob}
                  interview={interview}
                  currentQuestion={currentQuestion}
                  answer={answer}
                  setAnswer={setAnswer}
                  evaluation={evaluation}
                  turns={turns}
                  weakAreas={weakAreas}
                  interviewComplete={interviewComplete}
                  starting={startingInterview}
                  evaluating={evaluating}
                  history={interviewHistory}
                  expandedId={expandedInterviewId}
                  details={interviewDetails}
                  fallback={fallback}
                  onStart={() => {
                    void handleStartInterview();
                  }}
                  onSubmit={() => {
                    void handleSubmitAnswer();
                  }}
                  onNext={() => setEvaluation(null)}
                  onToggleHistory={(id) => {
                    void handleToggleHistory(id);
                  }}
                  onBack={() => setStep(3)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {traceOpen && (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trace-drawer-title"
          >
            <div
              className="absolute inset-0 bg-ink/50"
              onClick={() => setTraceOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              ref={tracePanelRef}
              id="trace-panel"
              tabIndex={-1}
              drag="x"
              dragControls={traceDragControls}
              dragListener={false}
              dragConstraints={{ left: 0, right: 260 }}
              dragElastic={0.15}
              dragSnapToOrigin
              onDragEnd={(_event, info) => {
                if (info.offset.x > 110 || info.velocity.x > 450) {
                  setTraceOpen(false);
                }
              }}
              initial={reduce ? false : { x: '100%' }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: '100%' }}
              transition={{ duration: 0.35, ease: EASE }}
              className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-paper shadow-2xl focus:outline-none sm:w-[380px] sm:max-w-[380px]"
            >
              <div
                onPointerDown={(event) => traceDragControls.start(event)}
                className="flex cursor-grab touch-none items-center justify-between gap-2 border-b border-line px-4 py-3 active:cursor-grabbing"
              >
                <span className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-linedark" aria-hidden="true" />
                  <span
                    id="trace-drawer-title"
                    className="font-mono text-[11px] uppercase tracking-[0.08em]"
                  >
                    Agent trace
                  </span>
                </span>
                <button
                  onClick={() => setTraceOpen(false)}
                  onPointerDown={(event) => event.stopPropagation()}
                  aria-label="Close trace"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-line hover:border-ink hover:bg-paper2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="h-[calc(100%-57px)]">
                <TraceRail
                  traces={traces}
                  fallback={fallback}
                  checking={llmStatus === null && !llmFailed}
                  unknown={llmFailed}
                  loading={tracesLoading}
                  compact
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this draft?"
        description={`The draft for ${
          pendingDelete?.title ?? 'this role'
        } will be removed from this session. This cannot be undone.`}
        confirmLabel="Delete draft"
        busy={confirmBusy}
        onConfirm={() => {
          if (pendingDelete) {
            void removeApplication(pendingDelete);
          }
        }}
        onCancel={() => {
          if (!confirmBusy) {
            setPendingDelete(null);
          }
        }}
      />

      <ConfirmDialog
        open={confirmExit}
        title="Leave the workspace?"
        description="Your typed answer and current practice view will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => {
          setConfirmExit(false);
          onExit();
        }}
        onCancel={() => setConfirmExit(false)}
      />

      <ApprovalDialog
        application={approvalTarget}
        saving={savingDraft}
        approving={approving}
        fallback={fallback}
        onSave={handleSaveDraft}
        onConfirm={handleApprove}
        onClose={closeApproval}
      />

      {toast ? <Toast message={toast} onDismiss={() => setToast(null)} /> : null}
    </div>
  );
}
