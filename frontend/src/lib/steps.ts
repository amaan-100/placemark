import type { AgentId } from './agents';

export type Step = 1 | 2 | 3 | 4;

export const STEPS: { n: Step; name: string; agent: AgentId; blurb: string }[] = [
  {
    n: 1,
    name: 'Profile',
    agent: 'resume',
    blurb: 'Resume Agent extracts skills, a summary, and the grounded facts later steps may use.',
  },
  {
    n: 2,
    name: 'Matches',
    agent: 'job',
    blurb: 'Job Agent searches live listings and ranks them against your resume.',
  },
  {
    n: 3,
    name: 'Approve',
    agent: 'document',
    blurb: 'Document Agent drafts — you review, edit, and approve before anything moves.',
  },
  {
    n: 4,
    name: 'Practice',
    agent: 'interview',
    blurb: 'Interview Agent asks one question at a time and scores each answer against a rubric.',
  },
];
