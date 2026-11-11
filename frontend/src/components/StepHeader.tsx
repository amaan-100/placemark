import { AGENT_META } from '../lib/agents';
import { STEPS, type Step } from '../lib/steps';
import { Mono } from './ui';

export function StepHeader({ n, title, sub }: { n: Step; title: string; sub: string }) {
  return (
    <header>
      <Mono className="text-accentdark">
        Step 0{n} — {AGENT_META[STEPS[n - 1].agent].name}
      </Mono>
      <h2
        id={`s${n}-title`}
        tabIndex={-1}
        className="mt-2 font-display text-4xl font-semibold tracking-tight focus:outline-none sm:text-5xl"
      >
        {title}
      </h2>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-inksoft">{sub}</p>
    </header>
  );
}
