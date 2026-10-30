"use client";
import { useState, type ReactNode } from "react";
import { Braces, CircleCheck, CircleX, ListTree, RefreshCw } from "lucide-react";
import type { CheckResult, RejectedExtraction, Source } from "@/lib/engine/types";
import type { StaleReason, StoredResult } from "@/lib/client/types";
import { AiLabel, cx, ModePill, RuleLabel, StatusPill, ui } from "@/components/ui/atoms";
import { ClaimCard } from "./ClaimCard";
import { EvidenceRow } from "./EvidenceRow";
import { RawJson } from "./RawJson";
import { RuleTrace } from "./RuleTrace";
import s from "./panel.module.css";

const REJECT_WORDS: Record<RejectedExtraction["reason"], string> = {
  QUOTE_NOT_FOUND: "The quote isn't a verbatim substring of the source, so the claim was dropped",
  SPAN_NOT_FOUND: "The span isn't a verbatim substring of the draft, so the claim was dropped",
  SUPERSEDES_QUOTE_NOT_FOUND: "The supersedes sentence isn't verbatim in the source, so it was dropped",
  INVALID_OUTPUT: "The AI output failed validation after one retry",
  EXTRACTION_ERROR: "The AI call failed (provider or network error)",
  ALL_CLAIMS_REJECTED: "Every claim from this source failed quote validation, so it counts as unread",
};

/** The governing evidence row first (as in the approved mockup), the rest in engine order. */
function governingFirst(claim: CheckResult["claims"][number]) {
  const g = claim.governing;
  if (!g) return claim.evidence;
  const isGov = (ev: CheckResult["claims"][number]["evidence"][number]) => ev.source.id === g.sourceId && ev.claim.quote === g.quote;
  return [...claim.evidence.filter(isGov), ...claim.evidence.filter((ev) => !isGov(ev))];
}

function GapDraft({ draft, result }: { draft: string; result: CheckResult }) {
  const marks = [...result.patternMatches].sort((a, b) => a.index - b.index);
  const nodes: ReactNode[] = [];
  let at = 0;
  marks.forEach((m, i) => {
    const start = draft.slice(m.index, m.index + m.text.length) === m.text ? m.index : draft.indexOf(m.text, at);
    if (start < at || start < 0) return;
    nodes.push(draft.slice(at, start));
    nodes.push(
      <span key={i} className={s.gapU}>
        {draft.slice(start, start + m.text.length)}
      </span>,
    );
    at = start + m.text.length;
  });
  nodes.push(draft.slice(at));
  return <p className={s.claimQ}>{nodes}</p>;
}

export function ReasoningTab({
  stored,
  staleReason,
  sources,
  onOpenQuote,
  onRecheck,
}: {
  stored: StoredResult | null;
  staleReason: StaleReason;
  sources: Source[];
  onOpenQuote: (sourceId: string, quote: string) => void;
  onRecheck: () => void;
}) {
  const [raw, setRaw] = useState(false);
  if (!stored) {
    return (
      <div className={s.empty}>
        <div className={s.eic}>
          <ListTree aria-hidden="true" />
        </div>
        <h3>No reasoning yet</h3>
        <p>Run a check to see every claim, its evidence quotes, the source signals and the rule trace.</p>
      </div>
    );
  }
  const { result } = stored;
  const draft = stored.key.draft;
  const bodyOf = (id: string) => sources.find((x) => x.id === id)?.body;
  const n = result.claims.length;
  const ai = result.ai;

  return (
    <>
      {staleReason ? (
        <div className={s.staleBar}>
          <RefreshCw aria-hidden="true" />
          <span style={{ flex: 1 }}>This reasoning is for an earlier check.</span>
          <button type="button" className={ui.link} onClick={onRecheck} style={{ fontSize: 12.5 }}>
            Recheck
          </button>
        </div>
      ) : null}
      <div className={s.sumRow}>
        <StatusPill decision={result.decision} />
        <span className={s.muted}>
          {n} claim{n === 1 ? "" : "s"} · most severe wins
        </span>
        <span className={s.spacer} />
        <button type="button" className={cx(ui.btn, ui.sm, ui.ghost, s.toggleBtn)} aria-pressed={raw} onClick={() => setRaw((r) => !r)}>
          <Braces aria-hidden="true" />
          Raw JSON
        </button>
      </div>
      {raw ? <RawJson value={result} /> : null}

      <div className={s.legend}>
        <AiLabel /> what the model read
        <RuleLabel /> deterministic step
      </div>

      <div className={s.sect}>
        <h3>Draft trace</h3>
        <span className={s.line} />
        <RuleLabel />
      </div>
      <section className={s.card} aria-label="Draft trace">
        <RuleTrace entries={result.trace} label="Draft-level rules" />
      </section>
      {result.caps.length > 0 ? (
        <p className={cx(s.note, s.noteWarn)}>
          <span className={s.noteBody}>
            {result.caps.map((c) => (
              <span key={c.sourceId} style={{ display: "block" }}>
                <span className={s.mono}>{c.code}</span> · {c.sourceId}: {c.detail}
              </span>
            ))}
          </span>
        </p>
      ) : null}

      {result.reasonCode === "EXTRACTION_GAP" && result.patternMatches.length > 0 ? (
        <section className={s.card} aria-label="Policy patterns found">
          <div className={s.cardH}>
            <h3>Policy patterns in the draft</h3>
            <span className={s.spacer} />
            <RuleLabel />
          </div>
          <div className={s.cardB}>
            <GapDraft draft={draft} result={result} />
            <p className={s.muted} style={{ margin: 0, fontSize: 12 }}>
              The detector matched {result.patternMatches.map((m) => `"${m.text}"`).join(", ")}, but the AI returned no in-scope claim. Nothing
              found is never proof of safety.
            </p>
          </div>
        </section>
      ) : null}

      {result.claims.map((claim, i) => (
        <div key={claim.draftClaim.claimId + i} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ClaimCard claim={claim} draft={draft} index={i} total={n} />
          <div className={s.sect}>
            <h3>
              Evidence · {claim.evidence.length} source{claim.evidence.length === 1 ? "" : "s"}
            </h3>
            <span className={s.line} />
          </div>
          {claim.evidence.length > 0 ? (
            <section className={s.card} aria-label={`Evidence for claim ${i + 1}`} data-tour={i === 0 ? "evidence" : undefined}>
              {governingFirst(claim).map((ev) => (
                <EvidenceRow
                  key={ev.claim.claimId}
                  ev={ev}
                  claim={claim}
                  governs={claim.governing?.sourceId === ev.source.id && claim.governing.quote === ev.claim.quote}
                  body={bodyOf(ev.source.id)}
                  onOpenQuote={onOpenQuote}
                />
              ))}
            </section>
          ) : (
            <p className={s.muted} style={{ margin: 0, fontSize: 12.5 }}>
              No source claim on this topic.
            </p>
          )}
          <div className={s.sect}>
            <h3>Rule trace · claim {i + 1}</h3>
            <span className={s.line} />
            <RuleLabel />
          </div>
          <section className={s.card} aria-label={`Rule trace for claim ${i + 1}`} data-tour={i === 0 ? "trace" : undefined}>
            <RuleTrace entries={claim.trace} label={`Rules for claim ${i + 1}`} />
          </section>
        </div>
      ))}

      <div className={s.sect}>
        <h3>Rejected extractions</h3>
        <span className={s.line} />
      </div>
      <section className={s.card} aria-label="Rejected extractions">
        {result.rejectedExtractions.length === 0 ? (
          <div className={s.rej}>
            <CircleCheck aria-hidden="true" style={{ color: "var(--allow)" }} />
            <span>None. Every quote matched its source verbatim.</span>
          </div>
        ) : (
          result.rejectedExtractions.map((r, i) => (
            <div key={i} className={s.rej}>
              <CircleX aria-hidden="true" />
              <span>
                <b>{r.sourceId}</b> · <span className={s.mono}>{r.reason}</span>
                <br />
                {REJECT_WORDS[r.reason]}
                {r.snippet ? (
                  <>
                    : <q>{r.snippet}</q>
                  </>
                ) : (
                  "."
                )}
              </span>
            </div>
          ))
        )}
      </section>

      <div className={s.sect}>
        <h3>AI run</h3>
        <span className={s.line} />
      </div>
      <section className={s.card} aria-label="AI run">
        <div className={s.cardB}>
          <dl className={s.kv}>
            <dt>Mode</dt>
            <dd>
              <ModePill ai={ai} small />
            </dd>
            <dt>Provider</dt>
            <dd>
              {ai.provider ?? "n/a"}
              {ai.fellBack ? ` · via fallback (${ai.provider ?? "fallback"})` : ""}
            </dd>
            <dt>Model</dt>
            <dd className={s.mono}>{ai.model || "n/a"}</dd>
            <dt>Latency</dt>
            <dd>
              {ai.latencyMs} ms{ai.mode === "saved" ? " (replayed, no model call)" : ""}
            </dd>
            <dt>Prompt</dt>
            <dd className={s.mono}>{ai.promptVersion}</dd>
            <dt>Check hash</dt>
            <dd className={s.mono} title={result.checkHash}>
              #{result.checkHash.slice(0, 12)}
            </dd>
          </dl>
        </div>
      </section>
    </>
  );
}
