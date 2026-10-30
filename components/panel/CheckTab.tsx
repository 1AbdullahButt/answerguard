"use client";
import { ArrowRight, ChevronRight, CircleCheck, FileText, Hash, Library, ListChecks, Pause, Pencil, RefreshCw, X } from "lucide-react";
import type { CheckResult, ClaimResult, Source } from "@/lib/engine/types";
import type { StaleReason, StoredResult } from "@/lib/client/types";
import type { CheckingState } from "@/lib/client/useAnswerGuard";
import {
  findRange,
  mostSevereClaim,
  railWords,
  REASON_WORDS,
  valueWords,
  weighedSources,
  weighedStanding,
  WEAKENER_WORDS,
} from "@/lib/client/format";
import { AiLabel, cx, ModePill, RuleLabel, StatusPill, ui } from "@/components/ui/atoms";
import { DecisionBanner } from "./DecisionBanner";
import { SafeReplyCard } from "./SafeReplyCard";
import s from "./panel.module.css";

const STALE_TEXT: Record<Exclude<StaleReason, null>, string> = {
  draft: "Draft changed since this check",
  rail: "Rail changed",
  persona: "Persona changed since this check",
  workspace: "Sources changed since this check",
};

const STAND_CLASS = { gov: ui.standGov, cand: ui.standCand, prop: ui.standProp, nye: ui.standNye, excl: ui.standExcl };

function highlightSpan(draft: string, span: string) {
  const r = findRange(draft, span);
  if (!r) return draft;
  return (
    <>
      {draft.slice(0, r.start)}
      <mark>{draft.slice(r.start, r.end)}</mark>
      {draft.slice(r.end)}
    </>
  );
}

/** "What to verify" for CAUTION, in words (no reason codes on the Check tab, D-021). */
function verifyItems(result: CheckResult): string[] {
  const items: string[] = [];
  for (const c of result.claims) {
    const gov = c.governing;
    const v = gov ? gov.valueText : null;
    switch (c.reasonCode) {
      case "WEAK_BASIS": {
        const ev = gov ? c.evidence.find((e) => e.source.id === gov.sourceId) : undefined;
        const w = ev?.weakeners.map((x) => WEAKENER_WORDS[x].toLowerCase()).join(", ") ?? "weakened";
        const owner = ev?.source.signals.owner?.name;
        items.push(`The rule points to ${v ?? "a value"}, but ${gov?.sourceId ?? "its source"} is ${w}. Confirm it${owner ? ` with ${owner}` : ""} before promising it.`);
        break;
      }
      case "CHANGE_SIGNALLED": {
        const sig = c.evidence.find((e) => (e.standing === "PROPOSAL" || e.standing === "NOT_YET_EFFECTIVE") && e.relation === "contradicts");
        items.push(
          sig
            ? `${sig.source.id} signals a change to ${sig.claim.valueText} (${sig.standing === "PROPOSAL" ? "proposed, not in force" : "not yet effective"}). Check whether it is live before promising ${v ?? "a timeline"}.`
            : `A change to this policy is signalled. Check whether it is live before promising ${v ?? "a timeline"}.`,
        );
        break;
      }
      case "PROPOSAL_ONLY":
        items.push(`Only a proposal mentions ${c.draftClaim.valueText}. Don't promise it until a policy confirms it.`);
        break;
      case "UNSUPPORTED":
        items.push(`No source supports ${c.draftClaim.valueText}. Check it with the policy owner.`);
        break;
      case "UNIT_MISMATCH":
        items.push(`The draft says ${c.draftClaim.valueText}; the policy says ${v ?? "a different unit"}. Match the unit.`);
        break;
      case "HEDGED_CONTRADICTION":
        items.push(`Your hedged "${c.draftClaim.valueText}" differs from the policy (${v ?? "another value"}). Reword it or confirm.`);
        break;
      case "OUTSIDE_COVERAGE":
        items.push(`The draft promises ${c.draftClaim.valueText}, which AnswerGuard doesn't cover. Check it against the source yourself.`);
        break;
      default:
        break;
    }
  }
  if (result.reasonCode === "EXTRACTION_GAP") {
    const hits = result.patternMatches.map((m) => `"${m.text}"`).join(", ");
    items.push(`AnswerGuard couldn't confirm the timing in this draft${hits ? ` (${hits})` : ""}. Check it manually.`);
  }
  if (result.reasonCode === "OUTSIDE_COVERAGE" && items.length === 0) items.push(REASON_WORDS.OUTSIDE_COVERAGE + ". Check it against the source yourself.");
  for (const cap of result.caps) items.push(`${cap.sourceId} couldn't be read, so it can't support Allow. It might hold a contradiction.`);
  if (items.length === 0) items.push(result.headline);
  return items;
}

function YourDraft({ draft, claim }: { draft: string; claim: ClaimResult }) {
  const gov = claim.governing;
  const govEv = gov ? claim.evidence.find((e) => e.source.id === gov.sourceId) : undefined;
  const contradicts = claim.decision === "HOLD" || claim.reasonCode === "HEDGED_CONTRADICTION";
  return (
    <section className={s.card} aria-label="Your draft">
      <div className={s.cardB} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={s.sect} style={{ margin: 0 }}>
            <h3>Your draft</h3>
          </span>
          <span className={s.spacer} />
          <AiLabel />
        </div>
        <div className={s.draftline}>{highlightSpan(draft, claim.draftClaim.span)}</div>
        <div className={s.vs}>
          <div>
            <div className={s.vsK}>Draft says</div>
            <b style={{ color: contradicts ? "var(--hold)" : undefined }}>{claim.draftClaim.value ? valueWords(claim.draftClaim.value) : claim.draftClaim.valueText}</b>
            {!claim.draftClaim.definitive ? <span className={s.muted}> · hedged</span> : null}
          </div>
          <ChevronRight aria-hidden="true" />
          <div>
            <div className={s.vsK}>
              Policy says (V) <RuleLabel />
            </div>
            {gov ? (
              <>
                <b>{valueWords(gov.value)}</b>
                {govEv ? <span className={s.muted}> · {railWords(govEv.claim.scope.rail)}</span> : null}
              </>
            ) : (
              <span className={s.muted}>No governing value</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CheckTab({
  draft,
  stored,
  staleReason,
  checking,
  sources,
  pausedVisible,
  onDismissPaused,
  onRecheck,
  onWhy,
  onRestoreSeed,
  onUseSafe,
}: {
  draft: string;
  stored: StoredResult | null;
  staleReason: StaleReason;
  checking: CheckingState | null;
  sources: Source[];
  pausedVisible: boolean;
  onDismissPaused: () => void;
  onRecheck: () => void;
  onWhy: () => void;
  onRestoreSeed: () => void;
  onUseSafe: () => void;
}) {
  const result = stored?.result ?? null;

  const paused =
    pausedVisible && result?.ai.paused ? (
      <p className={cx(s.note, s.noteWarn)}>
        <Pause aria-hidden="true" />
        <span className={s.noteBody}>
          <b>Live AI paused.</b> This demo&apos;s live-check limit was reached. Checks keep working from saved responses; edited
          sources without a saved response read as unavailable.
        </span>
        <button type="button" className={ui.iconbtn} style={{ width: 22, height: 22 }} aria-label="Dismiss" onClick={onDismissPaused}>
          <X aria-hidden="true" />
        </button>
      </p>
    ) : null;

  if (checking) {
    const steps = ["Reading draft", `Reading ${checking.sourceCount} source${checking.sourceCount === 1 ? "" : "s"}`, "Applying rules"];
    return (
      <>
        <ol className={s.steps} aria-live="polite" aria-label="Check progress">
          {steps.map((label, i) => (
            <li key={label} className={i < checking.step ? s.done : i === checking.step ? s.now : s.todo}>
              {i < checking.step ? <CircleCheck aria-hidden="true" /> : i === checking.step ? <span className={s.spin} aria-hidden="true" /> : <span className={s.todoDot} aria-hidden="true" />}
              {label}
              {i < checking.step ? <span className="sr-only"> (done)</span> : i === checking.step ? <span className="sr-only"> (in progress)</span> : null}
            </li>
          ))}
        </ol>
        <div className={cx(s.card, s.skCard)} aria-hidden="true">
          <div className={s.sk} style={{ width: "30%", height: 14 }} />
          <div className={s.sk} />
          <div className={s.sk} style={{ width: "80%" }} />
        </div>
        <div className={cx(s.card, s.skCard)} aria-hidden="true">
          <div className={s.sk} style={{ width: "40%" }} />
          <div className={s.sk} />
          <div className={s.sk} style={{ width: "60%" }} />
        </div>
        <p className={s.muted} style={{ fontSize: 11.5, margin: 0 }}>
          Send stays available but rechecks on the server.
        </p>
      </>
    );
  }

  if (!draft.trim()) {
    return (
      <div className={s.empty}>
        <div className={s.eic}>
          <Pencil aria-hidden="true" />
        </div>
        <h3>Write a reply to check it</h3>
        <p>
          AnswerGuard checks the draft in the composer against your team&apos;s docs before you send. Press <span className={ui.kbd}>Ctrl</span> +{" "}
          <span className={ui.kbd}>Enter</span> or <b>Check answer</b>.
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className={s.empty}>
        <div className={s.eic}>
          <ListChecks aria-hidden="true" />
        </div>
        <h3>Ready to check this draft</h3>
        <p>
          Press <b>Check answer</b> (or <span className={ui.kbd}>Ctrl</span> + <span className={ui.kbd}>Enter</span>). AnswerGuard pulls the
          claims out of the draft, weighs {sources.length} visible source{sources.length === 1 ? "" : "s"} with transparent rules and returns
          Allow, Caution, Hold or Escalate.
        </p>
      </div>
    );
  }

  const claim = mostSevereClaim(result);
  const stale = staleReason !== null;
  const weighed = weighedSources(result);
  const sourceCount = weighed.length || sources.length;
  const resultDraft = stored?.key.draft ?? draft;
  const changed = stored?.changedFrom ?? null;

  return (
    <>
      {paused}
      {stale && staleReason ? (
        <div className={s.staleBar}>
          <RefreshCw aria-hidden="true" />
          <span style={{ flex: 1 }}>{STALE_TEXT[staleReason]}</span>
          <button type="button" className={ui.link} onClick={onRecheck} style={{ fontSize: 12.5 }}>
            Recheck
          </button>
        </div>
      ) : null}
      {changed && !stale ? (
        <span className={s.changed}>
          <span className={s.changedOld}>
            <StatusPill decision={changed.decision} small />
          </span>
          <ArrowRight aria-hidden="true" />
          <StatusPill decision={result.decision} small />
          <span className={s.changedText} title={`Changed because ${changed.because}`}>
            Changed because {changed.because}
          </span>
        </span>
      ) : null}
      <DecisionBanner
        result={result}
        stale={stale}
        sourceCount={sourceCount}
        onWhy={onWhy}
        onRetry={onRecheck}
        onRestoreSeed={onRestoreSeed}
        animate={changed !== null && !stale}
      />

      {claim && claim.draftClaim.topic === "reversal_window" ? <YourDraft draft={resultDraft} claim={claim} /> : null}

      {result.suggestion ? <SafeReplyCard result={result} sources={sources} onUse={onUseSafe} /> : null}

      {result.decision === "CAUTION" ? (
        <section className={s.card} aria-label="What to verify">
          <div className={s.cardH}>
            <ListChecks aria-hidden="true" />
            <h3>What to verify</h3>
          </div>
          <div className={s.cardB}>
            <ul className={s.verify}>
              {verifyItems(result).map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            {!result.suggestion ? (
              <p className={s.muted} style={{ fontSize: 12, margin: "10px 0 0" }}>
                You can still send the original draft after ticking the acknowledgement in the composer.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {weighed.length > 0 ? (
        <section className={s.card} aria-label="Sources weighed">
          <div className={s.cardH}>
            <Library aria-hidden="true" />
            <h3>Sources weighed</h3>
            <span className={s.spacer} />
            <button type="button" className={ui.link} style={{ textTransform: "none", letterSpacing: 0, fontSize: 12 }} onClick={onWhy}>
              Open Reasoning
            </button>
          </div>
          <div className={s.cardB}>
            {weighed.map(({ ev, governs, claim: c }) => {
              const st = weighedStanding(ev, governs, c);
              const Icon = ev.source.kind === "slack" ? Hash : FileText;
              return (
                <div key={ev.source.id} className={s.srcrow}>
                  <Icon aria-hidden="true" />
                  <span className={s.srcT} title={ev.source.title}>
                    {ev.source.title}
                    <small>{ev.source.id}</small>
                  </span>
                  <span className={cx(ui.stand, STAND_CLASS[st.kind])}>{st.text}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className={s.runinfo}>
        <ModePill ai={result.ai} small />
        <span>
          {result.ai.provider ? `${result.ai.provider} · ` : ""}
          {result.ai.model}
        </span>
        <span>prompt {result.ai.promptVersion}</span>
        <span className={s.mono} style={{ fontSize: 11 }} title={result.checkHash}>
          #{result.checkHash.slice(0, 8)}
        </span>
      </div>
    </>
  );
}
