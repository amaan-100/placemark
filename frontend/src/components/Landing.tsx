import {
  ArrowRight,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Btn, Mono, Reveal, ScoreBar } from "./ui";

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-ink text-paper">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="leading-none">
              <p className="font-display text-lg font-bold tracking-tight">
                Placemark
              </p>
              <Mono className="mt-0.5 text-inksoft">Anonymous session</Mono>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mono className="hidden text-inksoft md:block">
              No accounts · Nothing auto-submitted
            </Mono>
            <Btn onClick={onEnter} className="hidden sm:inline-flex">
              Open the workspace <ArrowRight className="h-4 w-4" />
            </Btn>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-10 lg:pt-20">
        <div className="grid items-start gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Reveal>
              <Mono className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-inksoft">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-moss"
                  aria-hidden="true"
                />
                Approval-gated · Multi-agent · Placement season
              </Mono>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-6 font-display text-[13vw] font-semibold leading-[0.95] tracking-[-0.02em] sm:text-6xl lg:text-[4.6rem]">
                Your placement,
                <br />
                in four
                <br />
                <span className="italic text-accent">deliberate</span> steps.
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-inksoft">
                Upload your resume. Four agents do the searching, drafting, and
                drilling — and nothing moves forward without your explicit
                approval. You see every step they took, and how long it took.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Btn onClick={onEnter} className="min-h-[52px] px-7 text-base">
                  Start with your resume <ArrowRight className="h-5 w-5" />
                </Btn>
                <p className="font-mono text-[11px] uppercase tracking-wider text-inksoft">
                  Grounded in your resume — never invented.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
                {[
                  ["04", "Agents, one job each"],
                  ["01", "Approval gate, always"],
                  ["00", "Auto-submissions, always zero"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="sr-only">{label}</dt>
                    <dd className="font-display text-3xl font-semibold">
                      {value}
                    </dd>
                    <dd className="mt-1 text-xs leading-snug text-inksoft">
                      {label}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="lg:col-span-6">
            <Reveal delay={0.2}>
              <div className="relative">
                <div
                  className="absolute -left-3 -top-3 hidden h-full w-full rounded-[6px] border border-linedark sm:block"
                  aria-hidden="true"
                />
                <div className="relative overflow-hidden rounded-[6px] border-2 border-ink bg-card shadow-[8px_8px_0_#16130E]">
                  <div className="flex items-center justify-between border-b-2 border-ink bg-paper2 px-5 py-3">
                    <Mono className="font-semibold">
                      Session dossier — example
                    </Mono>
                    <Mono className="text-inksoft">Illustrative preview</Mono>
                  </div>
                  <div className="grid sm:grid-cols-5">
                    <div className="border-b border-line p-5 sm:col-span-3 sm:border-b-0 sm:border-r">
                      <Mono className="text-accentdark">Step 02 — Matches</Mono>
                      <p className="mt-2 font-display text-xl font-semibold leading-snug">
                        Frontend Engineer — Graduate Track
                      </p>
                      <p className="text-sm text-inksoft">
                        Northwind Labs · Bengaluru · Hybrid
                      </p>
                      <div className="mt-4 space-y-2">
                        {[
                          "React + TypeScript match",
                          "Figma-to-code workflow matches",
                          "Final-year eligible",
                        ].map((signal) => (
                          <p
                            key={signal}
                            className="flex items-center gap-2 text-[13px]"
                          >
                            <Check
                              className="h-4 w-4 shrink-0 text-moss"
                              aria-hidden="true"
                            />{" "}
                            {signal}
                          </p>
                        ))}
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                        <ScoreBar score={92} />
                        <Mono className="text-inksoft">Ranked 1 of 5</Mono>
                      </div>
                    </div>
                    <div className="p-5 sm:col-span-2">
                      <Mono className="text-inksoft">Agent trace</Mono>
                      <ol className="relative mt-3 space-y-3 border-l border-line pl-4">
                        {[
                          [
                            "RES",
                            "Extracted 10 skills from resume",
                            "0.8s",
                            "#2F5D3A",
                          ],
                          [
                            "JOB",
                            "Ranked 5 listings against profile",
                            "1.2s",
                            "#C23B0A",
                          ],
                          [
                            "DOC",
                            "Drafted cover note — pending",
                            "1.5s",
                            "#7A4E1F",
                          ],
                        ].map(([agent, label, ms, color]) => (
                          <li key={label} className="relative">
                            <span
                              className="absolute -left-[21px] top-1 h-2 w-2 rounded-full border-2 bg-card"
                              style={{ borderColor: color }}
                              aria-hidden="true"
                            />
                            <p
                              className="font-mono text-[10px] font-semibold"
                              style={{ color }}
                            >
                              {agent}
                            </p>
                            <p className="text-xs font-medium leading-snug">
                              {label}
                            </p>
                            <p className="font-mono text-[10px] text-inksoft">
                              {ms}
                            </p>
                          </li>
                        ))}
                      </ol>
                      <div className="mt-5 flex items-center justify-between rounded-[3px] border border-moss/50 bg-mossbg px-3 py-2">
                        <Mono className="text-moss">
                          Awaiting your approval
                        </Mono>
                        <ShieldCheck
                          className="h-4 w-4 text-moss"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink bg-ink px-5 py-3 text-paper">
                    <Mono>Nothing is auto-submitted</Mono>
                    <Mono className="text-paper/70">Approval records only</Mono>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="loop-title"
        className="border-t-2 border-ink bg-paper2/60"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2
                id="loop-title"
                className="font-display text-4xl font-semibold tracking-tight sm:text-5xl"
              >
                The loop, <span className="italic text-accent">in order.</span>
              </h2>
              <Mono className="text-inksoft">Each step gates the next</Mono>
            </div>
          </Reveal>
          <ol className="mt-10 divide-y divide-line border-y border-line">
            {[
              {
                n: 1,
                name: "Profile",
                agent: "Resume Agent",
                blurb:
                  "Resume Agent extracts skills, a summary, and grounded facts.",
              },
              {
                n: 2,
                name: "Matches",
                agent: "Job Agent",
                blurb:
                  "Job Agent searches live listings and ranks them against your resume.",
              },
              {
                n: 3,
                name: "Approve",
                agent: "Document Agent",
                blurb:
                  "Document Agent drafts — you approve before anything moves.",
              },
              {
                n: 4,
                name: "Practice",
                agent: "Interview Agent",
                blurb:
                  "Interview Agent asks one question at a time and scores against a rubric.",
              },
            ].map((step, index) => (
              <Reveal key={step.n} delay={index * 0.07}>
                <li className="group grid grid-cols-12 items-baseline gap-3 py-6 transition-colors hover:bg-card/70 sm:gap-6 sm:px-4">
                  <span className="col-span-3 font-display text-4xl font-semibold text-accent sm:col-span-1 sm:text-5xl">
                    0{step.n}
                  </span>
                  <div className="col-span-9 sm:col-span-4">
                    <h3 className="font-display text-2xl font-semibold">
                      {step.name}
                    </h3>
                    <Mono className="mt-1 text-inksoft">{step.agent}</Mono>
                  </div>
                  <p className="col-span-10 col-start-4 max-w-md text-[15px] leading-relaxed text-inksoft sm:col-span-6 sm:col-start-6">
                    {step.blurb}
                  </p>
                  <ChevronRight
                    className="col-span-1 hidden h-5 w-5 justify-self-end text-linedark transition-transform group-hover:translate-x-1 group-hover:text-accent sm:block"
                    aria-hidden="true"
                  />
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="trust-title" className="border-t-2 border-ink">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
          <Reveal>
            <h2
              id="trust-title"
              className="max-w-2xl text-balance font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:max-w-4xl"
            >
              Trust is the product.{" "}
              <span className="italic text-accent">Not a feature.</span>
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-px overflow-hidden rounded-[6px] border-2 border-ink bg-ink md:grid-cols-3">
            {[
              {
                title: "You stay in control",
                body: "The draft enters a pending state and stops. Approval is a deliberate, two-check handoff — and it only records your decision. It never submits anything to an employer.",
              },
              {
                title: "Every claim is grounded",
                body: "Agents may only use facts extracted from your resume. If a claim cannot be traced to your document, it does not get written. The extracted facts are always one click away.",
              },
              {
                title: "Every step is visible",
                body: "Each action is logged as it happens: what the agent did, how long it took, and whether AI was involved. There is no hidden work behind the interface.",
              },
            ].map((commitment, index) => (
              <Reveal
                key={commitment.title}
                delay={index * 0.08}
                className="bg-card"
              >
                <div className="flex h-full flex-col p-7">
                  <Mono className="text-accentdark">
                    Commitment 0{index + 1}
                  </Mono>
                  <h3 className="mt-3 font-display text-2xl font-semibold">
                    {commitment.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-inksoft">
                    {commitment.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.15}>
            <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-[6px] border border-line bg-card p-7 sm:flex-row sm:items-center">
              <div>
                <p className="font-display text-2xl font-semibold">
                  Ready when you are.
                </p>
                <p className="mt-1 text-sm text-inksoft">
                  No account needed. Your resume is stored for this browser
                  session only — deleted after 30 days of inactivity, or
                  immediately when you delete it.
                </p>
              </div>
              <Btn onClick={onEnter} className="min-h-[52px] px-7">
                Open the workspace <ArrowRight className="h-5 w-5" />
              </Btn>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <Mono className="text-inksoft">
            Placemark — a placement-season instrument
          </Mono>
          <Mono className="text-inksoft">Clear, calm, direct. No hype.</Mono>
        </div>
      </footer>
    </div>
  );
}
