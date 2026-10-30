import type { ClaimResult } from "@/lib/engine/types";
import { findRange, valueWords } from "@/lib/client/format";
import { AiLabel, RuleLabel } from "@/components/ui/atoms";
import s from "./panel.module.css";

/** One draft claim: the span highlighted in the draft, what the AI extracted, and what the rules concluded. */
export function ClaimCard({ claim, draft, index, total }: { claim: ClaimResult; draft: string; index: number; total: number }) {
  const r = findRange(draft, claim.draftClaim.span);
  const dc = claim.draftClaim;
  const gov = claim.governing;
  const fired = claim.trace.filter((t) => t.outcome === "fired").map((t) => t.rule);
  return (
    <section className={s.card} aria-label={`Claim ${index + 1} of ${total}`}>
      <div className={s.cardH}>
        <h3>
          Claim {index + 1} of {total}
        </h3>
        <span className={s.spacer} />
        <span className={s.mono} style={{ textTransform: "none", letterSpacing: 0, fontWeight: 600, color: "var(--muted)" }}>
          {claim.reasonCode}
        </span>
      </div>
      <div className={s.cardB}>
        <p className={s.claimQ}>
          {r ? (
            <>
              {draft.slice(0, r.start)}
              <mark>{draft.slice(r.start, r.end)}</mark>
              {draft.slice(r.end)}
            </>
          ) : (
            <mark>{dc.span}</mark>
          )}
        </p>
        <div className={s.evLine}>
          <AiLabel />
          <span className={s.evTxt}>
            <b>{dc.value ? valueWords(dc.value) : dc.valueText || "no value"}</b> · {dc.topic === "reversal_window" ? "reversal window" : "other topic"} ·{" "}
            {dc.definitive ? "definitive" : "hedged"}
          </span>
        </div>
        <div className={s.evLine}>
          <RuleLabel />
          <span className={s.evTxt}>
            {gov ? (
              <>
                V = <b>{valueWords(gov.value)}</b> from {gov.sourceId} ({gov.via === "EXPLICIT_SUPERSESSION" ? "D5" : gov.via === "SPECIFIC_EXCEPTION" ? "D6" : "D4"} fired) ·{" "}
              </>
            ) : (
              <>No governing value · </>
            )}
            {claim.decision.charAt(0) + claim.decision.slice(1).toLowerCase()} ({fired.length ? `fired: ${fired.join(", ")}` : "no rule fired"}) ·{" "}
            <span className={s.mono}>{claim.reasonCode}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
