"use client";
import { useId, useMemo, useRef, type ReactNode } from "react";
import { CircleCheck, CloudOff, Lock, Paperclip, RefreshCw, Reply, Send, ShieldCheck, TriangleAlert } from "lucide-react";
import type { CheckResult } from "@/lib/engine/types";
import type { StaleReason, StoredResult } from "@/lib/client/types";
import type { SendState } from "@/lib/client/useAnswerGuard";
import { DECISION_META, findRange, mostSevereClaim, REASON_WORDS } from "@/lib/client/format";
import { cx, TONE_ICON, ui } from "@/components/ui/atoms";
import s from "./inbox.module.css";

const MAX_DRAFT = 1000;

interface Range {
  start: number;
  end: number;
  cls: string;
}

const UNDERLINE: Record<string, string | undefined> = {
  HOLD: s.uHold,
  ESCALATE: s.uEsc,
  CAUTION: s.uCaution,
  ALLOW: s.uAllow,
};

function underlineRanges(draft: string, result: CheckResult): Range[] {
  const out: Range[] = [];
  if (result.reasonCode === "EXTRACTION_GAP") {
    for (const m of result.patternMatches) {
      const start = draft.slice(m.index, m.index + m.text.length) === m.text ? m.index : draft.indexOf(m.text);
      if (start >= 0) out.push({ start, end: start + m.text.length, cls: s.uGap ?? "" });
    }
  } else {
    for (const c of result.claims) {
      const r = findRange(draft, c.draftClaim.span);
      if (r) out.push({ ...r, cls: UNDERLINE[c.decision] ?? "" });
    }
  }
  out.sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) continue;
    merged.push(r);
  }
  return merged;
}

function renderBackdrop(draft: string, ranges: Range[]): ReactNode[] {
  const nodes: ReactNode[] = [];
  let at = 0;
  ranges.forEach((r, i) => {
    if (r.start > at) nodes.push(draft.slice(at, r.start));
    nodes.push(
      <span key={i} className={r.cls}>
        {draft.slice(r.start, r.end)}
      </span>,
    );
    at = r.end;
  });
  nodes.push(draft.slice(at) + "\n");
  return nodes;
}

function blockedCopy(result: CheckResult): string {
  const claim = mostSevereClaim(result);
  const words = REASON_WORDS[claim?.reasonCode ?? result.reasonCode];
  const v = claim?.governing ? ` (${claim.governing.valueText})` : "";
  return `The server rechecked this exact draft: ${words}${result.decision === "HOLD" ? v : ""}.`;
}

export function Composer({
  customer,
  draft,
  onChange,
  onCheck,
  onSend,
  checking,
  sendState,
  stored,
  staleReason,
  ack,
  onAck,
  onInsertSafe,
  panelOpen,
  onTogglePanel,
}: {
  customer: string;
  draft: string;
  onChange: (t: string) => void;
  onCheck: () => void;
  onSend: () => void;
  checking: boolean;
  sendState: SendState;
  stored: StoredResult | null;
  staleReason: StaleReason;
  ack: boolean;
  onAck: (v: boolean) => void;
  onInsertSafe: () => void;
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const result = stored?.result ?? null;
  const fresh = result && staleReason === null;

  const ranges = useMemo(() => (fresh && result ? underlineRanges(draft, result) : []), [fresh, result, draft]);

  const blocked = sendState.kind === "blocked";
  const needsAck = (result?.decision === "CAUTION" && staleReason === null) || sendState.kind === "ack_required";
  const empty = !draft.trim();
  const sendDisabled = empty || sendState.kind === "sending" || blocked || (needsAck && !ack);

  const blockedTone = blocked ? DECISION_META[sendState.result.decision].tone : null;
  const BlockedIcon = blockedTone ? TONE_ICON[blockedTone] : null;
  const hasSuggestion = blocked && sendState.result.suggestion !== null;

  return (
    <div className={cx(s.composer, blockedTone === "hold" && s.composerBlocked, blockedTone === "esc" && s.composerEsc)}>
      <div className={s.cTabs}>
        <span className={s.cTabOn}>Reply</span>
        <span aria-hidden="true">Note</span>
        <span className={s.cTo}>to {customer}</span>
      </div>
      <div className={s.cBody}>
        <div ref={backRef} className={s.backdrop} aria-hidden="true">
          {renderBackdrop(draft, ranges)}
        </div>
        <textarea
          ref={textRef}
          className={s.textarea}
          aria-label="Reply to customer"
          aria-describedby={hintId}
          placeholder={`Write a reply to ${customer}…`}
          value={draft}
          maxLength={MAX_DRAFT}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            if (backRef.current) backRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (!empty) onCheck();
            }
          }}
        />
      </div>

      {blocked && BlockedIcon ? (
        <div className={cx(s.cAlert, blockedTone === "esc" ? s.aEsc : s.aHold)} role="alert">
          <BlockedIcon aria-hidden="true" />
          <div className={s.cAlertText}>
            <b>Send blocked · {DECISION_META[sendState.result.decision].label}.</b> {blockedCopy(sendState.result)} Recorded as an
            intercept.
          </div>
          {hasSuggestion ? (
            <div className={s.aAct}>
              <button type="button" className={cx(ui.btn, ui.sm, ui.primary)} onClick={onInsertSafe}>
                <Reply aria-hidden="true" />
                {sendState.result.decision === "ESCALATE" ? "Insert holding reply" : "Insert safe reply"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {sendState.kind === "ack_required" ? (
        <div className={cx(s.cAlert, s.aCau)} role="alert">
          <TriangleAlert aria-hidden="true" />
          <div className={s.cAlertText}>
            <b>Not sent · Caution.</b> The server rechecked this draft and it needs your acknowledgement. Tick the box below, then
            send.
          </div>
        </div>
      ) : null}

      {sendState.kind === "unavailable" ? (
        <div className={cx(s.cAlert, s.aOff)} role="alert">
          <CloudOff aria-hidden="true" />
          <div className={s.cAlertText}>
            <b>AI unavailable: not sent.</b> AnswerGuard couldn&apos;t check this draft. Retry, or remove the policy claim. Not
            counted as an intercept.
          </div>
          <div className={s.aAct}>
            <button type="button" className={cx(ui.btn, ui.sm)} onClick={onSend}>
              <RefreshCw aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {needsAck ? (
        <label className={s.ack}>
          <input type="checkbox" checked={ack} onChange={(e) => onAck(e.target.checked)} />
          <span>I&apos;ve checked this and want to send it anyway.</span>
        </label>
      ) : null}

      <div className={s.cFoot}>
        <button type="button" className={ui.iconbtn} aria-label="Attach (not available in this demo)" disabled>
          <Paperclip aria-hidden="true" />
        </button>
        <span className={s.hint} id={hintId}>
          <span className={ui.kbd}>Ctrl</span> / <span className={ui.kbd}>⌘</span> + <span className={ui.kbd}>Enter</span> to check
        </span>
        <p role="status" className={s.status} style={{ margin: 0 }}>
          {sendState.kind === "sent" ? (
            <>
              <CircleCheck aria-hidden="true" />
              Sent to {sendState.customer}
            </>
          ) : null}
        </p>
        <span className={s.footSpacer} />
        <button
          type="button"
          className={cx(ui.btn, s.panelToggle)}
          aria-label="Open AnswerGuard panel"
          aria-expanded={panelOpen}
          onClick={onTogglePanel}
        >
          <ShieldCheck aria-hidden="true" />
          <span className="sr-only">AnswerGuard</span>
        </button>
        <button
          type="button"
          className={cx(ui.btn, ui.primary)}
          onClick={onCheck}
          disabled={empty}
          aria-busy={checking}
        >
          {checking ? <span className={s.spin} aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
          Check answer
        </button>
        <button
          type="button"
          className={ui.btn}
          onClick={onSend}
          disabled={sendDisabled}
          aria-busy={sendState.kind === "sending"}
          title={blocked ? `Blocked: ${DECISION_META[sendState.result.decision].label}. Edit the draft or use the safe reply.` : undefined}
        >
          {sendState.kind === "sending" ? (
            <span className={cx(s.spin, s.spinDark)} aria-hidden="true" />
          ) : blocked ? (
            <Lock aria-hidden="true" />
          ) : needsAck ? (
            <TriangleAlert aria-hidden="true" />
          ) : (
            <Send aria-hidden="true" />
          )}
          Send
        </button>
      </div>
    </div>
  );
}
