"use client";
import { useId, useState } from "react";
import { Check, ChevronDown, ChevronRight, ExternalLink, FileText, Hash, Minus, X } from "lucide-react";
import type { ClaimResult, Evidence } from "@/lib/engine/types";
import { evidenceChips, railWords, STANDING_WORDS, valueWords } from "@/lib/client/format";
import { AiLabel, cx, RuleLabel, ui } from "@/components/ui/atoms";
import { QuoteHighlight } from "./QuoteHighlight";
import { SignalChips } from "./SignalChips";
import s from "./panel.module.css";

const STATUS_WORDS: Record<Evidence["claim"]["statusWording"], string> = {
  in_force: "in force",
  proposed: "proposed",
  pending_approval: "pending approval",
  deprecated: "deprecated",
  unstated: "status not stated",
};

const APPLIES_WORDS: Record<Evidence["applicability"], string> = {
  APPLIES: "applies",
  SCOPE_UNRESOLVED: "scope unresolved (rail unknown)",
  NOT_APPLICABLE: "doesn't apply to this rail",
};

/** HTML comments are invisible to a reader; if a doc carries one, show it as inert data. */
function hiddenComments(body: string | undefined): string[] {
  if (!body) return [];
  return Array.from(body.matchAll(/<!--([\s\S]*?)-->/g)).map((m) => (m[1] ?? "").trim()).filter(Boolean);
}

export function EvidenceRow({
  ev,
  claim,
  governs,
  body,
  onOpenQuote,
}: {
  ev: Evidence;
  claim: ClaimResult;
  governs: boolean;
  body: string | undefined;
  onOpenQuote: (sourceId: string, quote: string) => void;
}) {
  const [open, setOpen] = useState(governs);
  const bodyId = useId();
  const excluded = ev.standing === "EXCLUDED";
  const KindIcon = ev.source.kind === "slack" ? Hash : FileText;
  const rel = excluded ? "ignored" : ev.relation;
  const relCls = rel === "contradicts" ? s.relCon : rel === "supports" ? s.relSup : s.relNa;
  const RelIcon = rel === "contradicts" ? X : rel === "supports" ? Check : Minus;
  const standText = governs ? "Governs" : STANDING_WORDS[ev.standing];
  const standCls = governs
    ? ui.standGov
    : ev.standing === "CANDIDATE"
      ? ui.standCand
      : ev.standing === "EXCLUDED"
        ? ui.standExcl
        : ui.standProp;
  const comments = excluded ? hiddenComments(body) : [];
  const c = ev.claim;
  const viaRule = claim.governing?.via === "EXPLICIT_SUPERSESSION" ? "D5" : claim.governing?.via === "SPECIFIC_EXCEPTION" ? "D6" : "D4";

  return (
    <div className={cx(s.ev, governs && s.evGov, excluded && s.evExcl)}>
      <button type="button" className={s.evHead} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        <KindIcon aria-hidden="true" />
        <span className={s.evTt}>
          <span className={s.evTitle}>{ev.source.title}</span>
          <span className={s.evId}>
            {ev.source.id} · {ev.source.kind.replace("_", " ")}
          </span>
        </span>
        <span className={s.evR}>
          <span className={cx(s.rel, relCls)}>
            <RelIcon aria-hidden="true" />
            {rel}
          </span>
          <span className={cx(ui.stand, standCls)}>{standText}</span>
        </span>
      </button>
      <div id={bodyId} className={s.evBody} hidden={!open}>
        {c.quote ? (
          <button type="button" className={s.evQ} onClick={() => onOpenQuote(ev.source.id, c.quote)}>
            <span className={s.open}>
              Open in Sources
              <ExternalLink aria-hidden="true" />
            </span>
            {body ? <QuoteHighlight text={body} quote={c.quote} context={60} /> : <mark>{c.quote}</mark>}
          </button>
        ) : null}
        <SignalChips chips={evidenceChips(ev)} label={`${ev.source.id} signals`} />
        {comments.map((t, i) => (
          <span key={i} className={s.inj}>
            Hidden comment in this doc (data, no effect): {t}
          </span>
        ))}
        <div className={s.evLine}>
          <AiLabel />
          <span className={s.evTxt}>
            <b>{c.value ? valueWords(c.value) : c.valueText || "no value"}</b> · {railWords(c.scope.rail)} · {STATUS_WORDS[c.statusWording]}
            {c.effectiveFrom ? ` · effective ${c.effectiveFrom}` : ""}
            {c.supersedes ? ` · supersedes "${c.supersedes.targetText}"` : ""}
          </span>
        </div>
        <div className={s.evLine}>
          <RuleLabel />
          <span className={s.evTxt}>
            <b>{STANDING_WORDS[ev.standing]}</b> ({ev.standingRule}) · {APPLIES_WORDS[ev.applicability]}
            {ev.weakeners.length ? ` · weakeners: ${ev.weakeners.join(", ")}` : ""} ·{" "}
            <span className={cx(s.rel, relCls)} style={{ display: "inline" }}>
              {ev.relation === "n/a" ? "n/a to the draft" : `${ev.relation} draft`}
            </span>
            {governs ? ` · sets V (${viaRule})` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
