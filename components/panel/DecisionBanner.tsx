"use client";
import { ChevronRight, Lock, RefreshCw, RotateCcw, Scale, Info } from "lucide-react";
import type { CheckResult } from "@/lib/engine/types";
import { DECISION_META, governingRule } from "@/lib/client/format";
import { cx, TONE_ICON, ui } from "@/components/ui/atoms";
import s from "./panel.module.css";

const TONE_CLASS = { allow: s.allow, caution: s.caution, hold: s.hold, esc: s.esc, off: s.off };

/**
 * The decision first (DESIGN.md §4): icon + label + one-line title (never wraps, D-021) and the engine's headline
 * verbatim. No raw reason codes here; they live in the Reasoning tab and Raw JSON.
 */
export function DecisionBanner({
  result,
  stale,
  sourceCount,
  onWhy,
  onRetry,
  onRestoreSeed,
  animate,
}: {
  result: CheckResult;
  stale: boolean;
  sourceCount: number;
  onWhy: () => void;
  onRetry: () => void;
  onRestoreSeed: () => void;
  animate: boolean;
}) {
  const meta = DECISION_META[result.decision];
  const Icon = TONE_ICON[meta.tone];
  const rule = governingRule(result);
  const n = result.claims.length;
  const off = result.decision === "AI_UNAVAILABLE";

  return (
    <section
      aria-label="Decision"
      data-tour="decision"
      aria-live="polite"
      className={cx(s.banner, TONE_CLASS[meta.tone], stale && s.stale, animate && s.bannerIn)}
    >
      <div className={s.bTop}>
        <Icon aria-hidden="true" />
        <h2 className={s.bTitle} title={`${meta.label} · ${meta.sub}`}>
          <span className={s.bLbl}>{meta.label}</span>
          <span className={s.bSub}>· {meta.sub}</span>
        </h2>
      </div>
      <p className={s.bHead}>{result.headline}</p>

      {off ? (
        <>
          <p className={s.note} style={{ marginTop: 10 }}>
            <Info aria-hidden="true" />
            <span className={s.noteBody}>
              Live AI couldn&apos;t answer and no saved response matches this draft and these sources. Restoring the seed versions
              lets saved responses replay.
            </span>
          </p>
          <div className={s.btnRow}>
            <button type="button" className={cx(ui.btn, ui.sm, ui.primary)} onClick={onRetry}>
              <RefreshCw aria-hidden="true" />
              Retry
            </button>
            <button type="button" className={cx(ui.btn, ui.sm)} onClick={onRestoreSeed}>
              <RotateCcw aria-hidden="true" />
              Restore seed versions
            </button>
          </div>
          <div className={cx(s.bMeta, s.bMetaWrap)}>
            <span style={{ whiteSpace: "normal" }}>
              <Lock aria-hidden="true" />
              Sending will be refused until this draft can be checked. Not counted as an intercept.
            </span>
          </div>
        </>
      ) : (
        <div className={s.bMeta}>
          <span style={{ flex: "none" }}>
            {n} claim{n === 1 ? "" : "s"} · {sourceCount} source{sourceCount === 1 ? "" : "s"}
          </span>
          {rule ? (
            <span>
              <Scale aria-hidden="true" />
              <span className={s.ell}>{rule}</span>
            </span>
          ) : null}
          {result.caps.length > 0 ? (
            <span>
              <span className={s.ell}>Capped: {result.caps.map((c) => `${c.sourceId} unread`).join(", ")}</span>
            </span>
          ) : null}
          <span className={s.spacer} />
          <button type="button" className={ui.link} onClick={onWhy} style={{ fontSize: 12, flex: "none" }}>
            Why
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
