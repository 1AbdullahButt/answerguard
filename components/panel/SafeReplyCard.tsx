"use client";
import { useState } from "react";
import { Check, Copy, FileText, Reply, TriangleAlert } from "lucide-react";
import type { CheckResult, Source } from "@/lib/engine/types";
import { cautionRecheckReason, DECISION_META, mostSevereClaim, shortDate } from "@/lib/client/format";
import { cx, ui } from "@/components/ui/atoms";
import s from "./panel.module.css";

/** The safe (or holding) reply. It has already been rechecked by the server; the chip shows that recheck. */
export function SafeReplyCard({
  result,
  sources,
  onUse,
}: {
  result: CheckResult;
  sources: Source[];
  onUse: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const sug = result.suggestion;
  if (!sug) return null;
  const holding = result.decision === "ESCALATE";
  const claim = mostSevereClaim(result);
  const gov = !holding ? (claim?.governing ?? null) : null;
  const govEv = gov ? claim?.evidence.find((e) => e.source.id === gov.sourceId) : undefined;
  const govSrc = gov ? sources.find((x) => x.id === gov.sourceId) : undefined;
  const sig = govEv?.source.signals;

  const recheck = sug.recheckDecision;
  const cautionReason = recheck === "CAUTION" ? cautionRecheckReason(result) : null;

  return (
    <section className={s.card} aria-label="Safe reply">
      <div className={s.cardH}>
        <Reply aria-hidden="true" />
        <h3>{holding ? "Holding reply" : "Safe reply"}</h3>
        <span className={s.spacer} />
        {recheck === "ALLOW" ? (
          <span className={cx(s.recheck, s.recheckAllow)} title="The server ran this exact text through the full check">
            <Check aria-hidden="true" />
            Rechecked ✓ Allow
          </span>
        ) : (
          <span className={cx(s.recheck, recheck === "CAUTION" ? s.recheckCaution : s.recheckAllow)} title="The server ran this exact text through the full check">
            <TriangleAlert aria-hidden="true" />
            Rechecked · {DECISION_META[recheck].label}
          </span>
        )}
      </div>
      <div className={s.cardB}>
        {cautionReason ? <p className={s.recheckNote}>Rechecked as Caution: {cautionReason}. You&apos;ll be asked to acknowledge it on send.</p> : null}
        <p className={s.reply}>{sug.text}</p>
        {gov ? (
          <div className={s.cite}>
            <mark>{gov.quote}</mark>
            <div className={s.citeSrc}>
              <FileText aria-hidden="true" />
              <span>
                {govEv?.source.title ?? govSrc?.title ?? gov.sourceId} · {gov.sourceId}
                {sig?.verification === "verified" && sig.verifiedAt ? ` · Verified ${shortDate(sig.verifiedAt)}` : ""}
                {sig?.owner ? ` · ${sig.owner.name}` : ""}
              </span>
            </div>
          </div>
        ) : holding ? (
          <p className={s.note} style={{ marginTop: 2 }}>
            <span className={s.noteBody}>No timeline: the sources can&apos;t settle one for this ticket. Confirm with the policy owner first.</span>
          </p>
        ) : null}
        <div className={s.actions}>
          <button type="button" className={cx(ui.btn, ui.primary)} onClick={onUse}>
            <Reply aria-hidden="true" />
            Use safe reply
          </button>
          <button
            type="button"
            className={ui.btn}
            onClick={() => {
              try {
                void navigator.clipboard.writeText(sug.text).then(() => setCopied(true));
              } catch {
                setCopied(false);
              }
            }}
          >
            <Copy aria-hidden="true" />
            {copied ? "Copied" : "Copy"}
          </button>
          <span className={s.origin} title={sug.origin === "ai" ? "Worded by the AI from V and its quote only, then rechecked" : "Built from a fixed template"}>
            {sug.origin === "ai" ? "AI worded" : "Template"}
          </span>
        </div>
      </div>
    </section>
  );
}
