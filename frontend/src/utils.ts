export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'recently';
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  const seconds = ms / 1000;
  if (seconds < 0.1) {
    return '0.1s';
  }
  if (seconds < 10) {
    return `${seconds.toFixed(1)}s`;
  }
  return `${Math.round(seconds)}s`;
}

export function summarizeOutput(output: Record<string, unknown>): string {
  const entries = Object.entries(output)
    .filter(([, value]) => value !== null && typeof value !== 'object')
    .slice(0, 3);
  if (entries.length === 0) {
    return 'Run recorded';
  }
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' · ');
}

export function summarizeTrace(
  output: Record<string, unknown>,
  traceAction?: string,
): string {
  const action = traceAction || String(output.action ?? '');
  const query = String(output.query ?? '');
  const source = String(output.source ?? '');
  const cached = output.cached === true;
  const count = typeof output.count === 'number' ? output.count : undefined;
  const skills = output.skills as string[] | undefined;
  const used = output.llm as { used?: boolean } | undefined;

  if (action === 'search') {
    const parts: string[] = [];
    parts.push(`Found ${count ?? 0} jobs`);
    if (query) {
      parts.push(`for “${query}”`);
    }
    if (source) {
      parts.push(`— ${source.replace('_', ' ')}`);
    }
    if (cached) {
      parts.push('(cached)');
    }
    return parts.join(' ');
  }
  if (action === 'draft') {
    const skillList = skills ? ` — matched skills: ${skills.slice(0, 4).join(', ')}` : '';
    return `Drafted application${skillList}`;
  }
  if (action === 'analyze') {
    const skillList = skills ? ` — ${skills.length} skills detected` : '';
    return `Analyzed resume${skillList}`;
  }
  if (action === 'evaluate') {
    const score = typeof output.score === 'number' ? output.score : undefined;
    return `Scored interview answer${score !== undefined ? ` — ${score}/100` : ''}`;
  }
  if (action === 'question' || action === 'start') {
    const goal = String(output.goal ?? '');
    return goal ? `Generated interview question — ${goal}` : 'Generated interview question';
  }
  if (used !== undefined) {
    return `${action} (${used ? 'AI-assisted' : 'template fallback'})`;
  }
  return summarizeOutput(output);
}

export function sourceLabel(source: string): string {
  if (source === 'live_api') {
    return 'Live jobs API';
  }
  if (source === 'mock_fallback') {
    return 'Mock fallback';
  }
  return source.replaceAll('_', ' ');
}

export function statusLabel(status: string): string {
  if (status === 'PENDING_APPROVAL') {
    return 'Pending approval';
  }
  if (status === 'APPROVED') {
    return 'Approved';
  }
  return status.toLowerCase().replaceAll('_', ' ');
}
