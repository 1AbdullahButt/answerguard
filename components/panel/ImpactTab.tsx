"use client";
import { useId } from "react";
import { Check, FlaskConical, Info, X } from "lucide-react";
import { falseAlarmStats, type Metrics, type Review } from "@/lib/client/metrics";
import { timeOf } from "@/lib/client/format";
import { cx, StatusPill } from "@/components/ui/atoms";
import s from "./panel.module.css";

/**
 * One metric tile. The group holds only the value, so screen readers hear "Unsafe sends intercepted, 1"
 * and the definition (no digits) sits outside it.
 */
function Tile({ label, value, small, note }: { label: string; value: string; small?: boolean; note?: string }) {
  const id = useId();
  return (
    <div className={s.tile}>
      <span id={id} className={s.tileK}>
        {label}
      </span>
      <div role="group" aria-labelledby={id} className={cx(s.tileV, small && s.tileVSmall)}>
        {value}
      </div>
      {note ? <span className={s.tileN}>{note}</span> : null}
    </div>
  );
}

/** Impact (SPEC §11): three honest, simulated metrics for this browser, plus flag review. */
export function ImpactTab({ metrics, onReview }: { metrics: Metrics; onReview: (checkHash: string, r: Review | null) => void }) {
  const fa = falseAlarmStats(metrics);
  return (
    <>
      <span className={s.simLabel}>
        <FlaskConical aria-hidden="true" />
        Simulated · this browser
      </span>
      <div className={s.tiles}>
        <Tile label="Drafts checked" value={String(metrics.checked.length)} />
        <Tile label="Unsafe sends intercepted" value={String(metrics.intercepts)} />
        <Tile
          label="False-alarm rate"
          value={fa.rate === null ? "Not enough reviewed flags yet" : `${Math.round(fa.rate * 100)}%`}
          small={fa.rate === null}
          note={`n = ${fa.reviewed} reviewed`}
        />
      </div>
      <section className={s.card} aria-label="Metric definitions">
        <div className={s.cardB}>
          <ul className={s.defs}>
            <li>
              <b>Drafts checked:</b> distinct ticket and draft pairs checked in this browser.
            </li>
            <li>
              <b>Unsafe sends intercepted:</b> send attempts the server blocked as Hold or Escalate. A banner alone doesn&apos;t count.
            </li>
            <li>
              <b>False-alarm rate:</b> flags you marked &ldquo;False alarm&rdquo; out of the flags you reviewed. Shown from three reviews.
            </li>
          </ul>
        </div>
      </section>

      <div className={s.sect}>
        <h3>Past flags</h3>
        <span className={s.line} />
      </div>
      <section className={s.card} aria-label="Past flags">
        {metrics.flags.length === 0 ? (
          <div className={s.empty} style={{ padding: "18px 12px" }}>
            <p>No flags yet. Every Caution, Hold or Escalate check appears here for review.</p>
          </div>
        ) : (
          metrics.flags.map((f) => (
            <div key={f.checkHash} className={s.flag}>
              <div className={s.flagTop}>
                <StatusPill decision={f.decision} small />
                <span className={s.mono}>{f.ticketId}</span>
                <span>· {f.customer}</span>
                <span className={s.spacer} />
                <span>{timeOf(f.at)}</span>
              </div>
              <p className={s.flagHead}>{f.headline}</p>
              <p className={s.flagDraft} title={f.draft}>
                Draft: {f.draft}
              </p>
              <div className={s.segRev} role="group" aria-label={`Review this ${f.decision.toLowerCase()} flag on ${f.ticketId}`}>
                {(
                  [
                    ["correct", "Correct catch", Check],
                    ["false_alarm", "False alarm", X],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={f.review === key}
                    onClick={() => onReview(f.checkHash, f.review === key ? null : key)}
                  >
                    <Icon aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
      <p className={s.disclaimer}>
        <Info aria-hidden="true" />
        <span>These are not measured Slite results. Intercepted sends don&apos;t equal prevented customer harm.</span>
      </p>
    </>
  );
}
