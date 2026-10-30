import { Check, CircleX, Minus, Zap } from "lucide-react";
import type { TraceEntry } from "@/lib/engine/types";
import { cx } from "@/components/ui/atoms";
import s from "./panel.module.css";

const OUTCOME = {
  pass: { text: "passed", Icon: Check, cls: s.ocPass },
  fired: { text: "fired", Icon: Zap, cls: s.ocFired },
  skipped: { text: "skipped", Icon: Minus, cls: s.ocSkip },
  fail: { text: "failed", Icon: CircleX, cls: s.ocFail },
} as const;

/** Splits "1) … 2) … 3) …" into numbered conditions (D5's four conditions). */
function splitConditions(detail: string): { lead: string; conds: string[] } | null {
  const parts = detail.split(/(?:^|\s)(\d)\)\s/);
  if (parts.length < 5) return null;
  const lead = parts[0] ?? "";
  const conds: string[] = [];
  for (let i = 2; i < parts.length; i += 2) conds.push((parts[i] ?? "").trim());
  return { lead: lead.trim(), conds };
}

/** Ordered rule trace, engine order, nothing hidden (SPEC §7.3). */
export function RuleTrace({ entries, label }: { entries: TraceEntry[]; label: string }) {
  return (
    <ol className={s.trace} aria-label={label}>
      {entries.map((e, i) => {
        const o = OUTCOME[e.outcome];
        const split = e.rule === "D5" || e.outcome === "fired" ? splitConditions(e.detail) : null;
        return (
          <li key={i} className={cx(e.outcome === "fired" && s.liFired, e.outcome === "skipped" && s.liSkip)}>
            <span className={s.rc}>{e.rule}</span>
            <span className={cx(s.oc, o.cls)}>
              <o.Icon aria-hidden="true" />
              {o.text}
            </span>
            <span className={s.dt}>
              {split ? (
                <>
                  {split.lead ? <span>{split.lead} </span> : null}
                  <ol className={s.conds}>
                    {split.conds.map((c, j) => (
                      <li key={j}>
                        <span className={s.condN} aria-hidden="true">
                          {j + 1}
                        </span>
                        <span>
                          <span className="sr-only">Condition {j + 1}: </span>
                          {c}
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                e.detail
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
