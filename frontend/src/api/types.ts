export type SkillFacts = {
  skills: string[];
  summary?: string;
};

export type ResumeUpload = {
  resume_id: number;
  filename: string;
  facts: SkillFacts;
  created_at: string;
};

export type ResumeInfo = {
  id: number;
  filename: string;
  facts: SkillFacts;
  created_at: string;
};

export type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  skills: string[];
  deadline: string | null;
  match_score: number;
  source: string;
};

export type JobSearchResponse = {
  source: string;
  cached: boolean;
  jobs: Job[];
};

export type ApplicationStatus = 'PENDING_APPROVAL' | 'APPROVED' | string;

export type Application = {
  id: number;
  job_id: number | null;
  company: string;
  title: string;
  url: string;
  deadline: string | null;
  status: ApplicationStatus;
  resume_draft: string;
  cover_note: string;
  created_at: string;
  updated_at: string;
};

export type ApplicationList = {
  applications: Application[];
};

export type ApplicationUpdate = {
  resume_draft?: string;
  cover_note?: string;
  deadline?: string | null;
};

export type DraftResponse = {
  application_id: number;
  status: ApplicationStatus;
  resume_draft: string;
  cover_note: string;
};

export type ApproveResponse = {
  application_id: number;
  status: ApplicationStatus;
  message: string;
};

export type ApplicationDeleteResponse = {
  deleted: number;
};

export type InterviewStart = {
  interview_id: number;
  question: string;
  status: string;
  turn: number;
  max_turns: number;
};

export type InterviewTurnOut = {
  id: number;
  turn_index: number;
  question: string;
  answer: string | null;
  score: number | null;
  feedback: string | null;
  rubric: Record<string, unknown>;
  created_at: string;
};

export type InterviewAnswerResponse = {
  interview_id: number;
  turn: number;
  max_turns: number;
  score: number;
  feedback: string;
  rubric: Record<string, unknown>;
  next_question: string | null;
  status: string;
};

export type InterviewSummaryOut = {
  id: number;
  goal: string;
  status: string;
  turn_count: number;
  max_turns: number;
  weak_areas: string[];
  created_at: string;
};

export type InterviewDetailResponse = {
  id: number;
  goal: string;
  status: string;
  turn_count: number;
  max_turns: number;
  weak_areas: string[];
  turns: InterviewTurnOut[];
  created_at: string;
  updated_at: string;
};

export type InterviewListResponse = {
  interviews: InterviewSummaryOut[];
};

export type Dashboard = {
  applications: number;
  pending_approvals: number;
  approved: number;
  interviews: number;
};

export type Trace = {
  id: number;
  agent: string;
  action: string;
  status: string;
  latency_ms: number;
  output: Record<string, unknown>;
  created_at: string;
};

export type SessionInfo = {
  session_id: string;
  created_at: string;
};

export type Health = {
  status: string;
  agent: string;
  approval_gate: boolean;
};

export type LlmStatus = {
  enabled: boolean;
  available: boolean;
};

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
  request_id?: string;
  detail?: string;
};

export type Reminder = {
  application_id: number;
  title: string;
  company: string;
  deadline: string;
  days_left: number;
  kind: "overdue" | "today" | "soon" | "later";
};

export type ReminderList = {
  items: Reminder[];
  overdue: number;
  due_soon: number;
  total: number;
};
