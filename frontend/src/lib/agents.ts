import type { Trace } from '../api/types';

export type AgentId = 'resume' | 'job' | 'document' | 'interview' | 'calendar' | 'system';

export const AGENT_META: Record<AgentId, { name: string; short: string; color: string }> = {
  resume: { name: 'Resume Agent', short: 'RES', color: '#2F5D3A' },
  job: { name: 'Job Agent', short: 'JOB', color: '#C23B0A' },
  document: { name: 'Document Agent', short: 'DOC', color: '#7A4E1F' },
  interview: { name: 'Interview Agent', short: 'INT', color: '#3E4A6B' },
  calendar: { name: 'Calendar Agent', short: 'CAL', color: '#5B3A72' },
  system: { name: 'Session', short: 'SYS', color: '#57503F' },
};

export function toAgentId(value: string): AgentId {
  return value in AGENT_META ? (value as AgentId) : 'system';
}

const ACTION_LABELS: Record<string, string> = {
  analyze: 'Resume parsed',
  search: 'Listings searched & ranked',
  draft: 'Draft created',
  evaluate: 'Answer scored',
  question: 'Interview question ready',
  start: 'Interview started',
  export_ics: 'Calendar file generated',
};

export function traceLabel(trace: Trace): string {
  return ACTION_LABELS[trace.action] ?? trace.action.replaceAll('_', ' ');
}

export function traceTime(trace: Trace): string {
  const date = new Date(trace.created_at);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}
