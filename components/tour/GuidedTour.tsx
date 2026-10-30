"use client";
// Guided demo tour (SPEC §15 P1, §16 demo script). A non-modal coach mark: role="dialog" without aria-modal,
// anchored to the element it talks about, with a highlight ring. Each step can drive the app through the same
// actions a user would trigger (select ticket, fill the canonical draft, Check, switch tabs, apply variant B7).
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CircleCheck, Compass, X } from "lucide-react";
import type { AnswerGuard } from "@/lib/client/useAnswerGuard";
import { cx, ui } from "@/components/ui/atoms";
import s from "./tour.module.css";

export const CANONICAL_DRAFT = "Failed transfers are reversed within 4 business days.";
export const TOUR_STEPS = 5;

export interface TourState {
  mode: "offer" | "tour";
  step: number; // 0-based
}

interface Ctx {
  ag: AnswerGuard;
  showPanel: () => void;
  hidePanel: () => void;
}

interface Step {
  title: string;
  body: ReactNode;
  target: (ag: AnswerGuard, applied: boolean) => string[];
  enter?: (c: Ctx) => void;
}

function catchSetup({ ag, showPanel }: Ctx) {
  ag.actions.prepareTicket("TCK-9001", CANONICAL_DRAFT);
  ag.actions.setTab("check");
  showPanel();
  void ag.actions.runCheck();
}

const STEPS: Step[] = [
  {
    title: "Catch a wrong promise",
    body: (
      <>
        Ayesha&apos;s transfer went over the <b>instant rail</b>, and the draft promises <b>4 business days</b>. Before it&apos;s
        sent, AnswerGuard checks it against the team&apos;s docs: <b>Hold</b>. The instant-rail exception (DOC-103) says 1 business day.
      </>
    ),
    target: () => ['[data-tour="decision"]', '[data-tour="composer"]'],
    enter: catchSetup,
  },
  {
    title: "Why the verified SOP lost",
    body: (
      <>
        The AI only pulled out claims and verbatim quotes. The <b>rules</b> decided: DOC-103 explicitly supersedes section 3 of the SOP
        for instant-rail transfers (<b>rule D5</b>), so its 1 business day governs. The SOP is verified too, but verification and recency
        never break a tie.
      </>
    ),
    target: () => ['[data-tour="evidence"]', '[data-tour="trace"]'],
    enter: (c) => {
      const r = c.ag.results["TCK-9001"];
      if (!r || c.ag.ticket?.id !== "TCK-9001" || r.result.decision !== "HOLD") catchSetup(c);
      c.ag.actions.setTab("reasoning");
      c.showPanel();
    },
  },
  {
    title: "Recover: blocked, then the safe reply",
    body: (
      <>
        Sending always <b>rechecks on the server</b>. The wrong draft comes back Hold, so it&apos;s blocked and counted as an intercept.
        The safe reply was already rechecked as Allow, so it goes through.
      </>
    ),
    target: () => ['[data-tour="composer"]'],
    enter: ({ ag, hidePanel }) => {
      if (ag.ticket?.id !== "TCK-9001") ag.actions.prepareTicket("TCK-9001");
      ag.actions.setTab("check");
      hidePanel();
    },
  },
  {
    title: "Ambiguity: escalate, no timeline",
    body: (
      <>
        Usman&apos;s rail is <b>unknown</b>, and the rules differ by rail (rule D1). AnswerGuard <b>escalates</b> instead of guessing, and
        the holding reply contains no timeline at all.
      </>
    ),
    target: () => ['[data-tour="safe-reply"]', '[data-tour="decision"]'],
    enter: ({ ag, showPanel }) => {
      ag.actions.prepareTicket("TCK-9002", CANONICAL_DRAFT);
      ag.actions.setTab("check");
      showPanel();
      void ag.actions.runCheck();
    },
  },
  {
    title: "Live proof: edit a source",
    body: (
      <>
        Change DOC-103 from 1 to <b>2 business days</b> with <b>Save draft</b>. Its Oct 26 verification no longer covers the new text
        (<b>edited after verification</b>), so the result drops to <b>Caution</b> instead of a confident Hold. With <b>Save and verify
        (simulated)</b> it would be Hold at 2 days. Reset workspace restores the seed.
      </>
    ),
    target: (_ag, applied) => (applied ? ['[data-tour="decision"]'] : ['[data-tour="source-DOC-103"]']),
    enter: ({ ag, showPanel }) => {
      // Start from the canonical Hold so the change chip reads "Hold → Caution" after the edit. If DOC-103 is already
      // edited in this workspace, leave it alone: the step offers an explicit restore instead of changing it silently.
      ag.actions.prepareTicket("TCK-9001", CANONICAL_DRAFT);
      if (!ag.overrides["DOC-103"]) void ag.actions.runCheck();
      ag.actions.setTab("sources");
      showPanel();
    },
  },
];

function findTarget(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) return el;
    }
  }
  return null;
}

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CARD_W = 328;

/** Prefer the left of the target (the panel is on the right), then below, then above. */
function placeCard(t: Box | null, cardH: number): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const minTop = 56;
  const maxTop = Math.max(minTop, vh - cardH - 44);
  if (!t) return { top: minTop + 8, left: Math.max(8, vw - CARD_W - 16) };
  const clampTop = (y: number) => Math.min(Math.max(y, minTop), maxTop);
  if (t.left - CARD_W - 20 >= 8) return { top: clampTop(t.top), left: t.left - CARD_W - 20 };
  if (t.left + t.width + 20 + CARD_W <= vw - 8) return { top: clampTop(t.top), left: t.left + t.width + 20 };
  const left = Math.min(Math.max(8, t.left), vw - CARD_W - 8);
  if (t.top + t.height + 12 + cardH <= vh - 40) return { top: t.top + t.height + 12, left };
  return { top: clampTop(t.top - cardH - 12), left };
}

export function GuidedTour({
  state,
  ag,
  overlay,
  onStep,
  onStart,
  onClose,
}: {
  state: TourState;
  ag: AnswerGuard;
  overlay: boolean;
  onStep: (step: number) => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 64, left: 16 });
  const [applied, setApplied] = useState(false);
  const [phoneTop, setPhoneTop] = useState(false);
  const scrolledFor = useRef<string>("");
  const agRef = useRef(ag);
  agRef.current = ag;

  const ctx = useCallback(
    (): Ctx => ({
      ag: agRef.current,
      showPanel: () => {
        if (overlay) agRef.current.actions.setPanelOpen(true);
      },
      hidePanel: () => {
        if (overlay) agRef.current.actions.setPanelOpen(false);
      },
    }),
    [overlay],
  );

  const isTour = state.mode === "tour";
  const step = STEPS[state.step];
  const ready = Boolean(ag.seed);

  // Drive the app when a step is entered (once per step change).
  useEffect(() => {
    if (!isTour || !ready || !step) return;
    if (state.step === 4) setApplied(false);
    step.enter?.(ctx());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTour, state.step, ready]);

  // Focus the step title on open and on every step change (focus management for a non-modal dialog).
  useEffect(() => {
    const t = window.setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 30);
    return () => window.clearTimeout(t);
  }, [state.mode, state.step]);

  // Esc closes the tour when focus is in the tour card or on the page body, not while another dialog/tooltip has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const active = document.activeElement;
      const inOtherDialog = !!active && !cardRef.current?.contains(active) && !!active.closest('[role="dialog"], [role="alertdialog"], [role="tooltip"]');
      if (!inOtherDialog) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Track the anchored element (it moves as the app renders results, opens panels or scrolls).
  useLayoutEffect(() => {
    const selectors = isTour && step ? step.target(agRef.current, applied) : ['[data-tour="tour-button"]'];
    const key = selectors.join(",");
    const update = () => {
      const el = findTarget(selectors) ?? (isTour ? document.querySelector<HTMLElement>(selectors[0] ?? "") : null);
      // Bring the anchor into view once per step (never fight the user's own scrolling afterwards).
      if (el && isTour && scrolledFor.current !== key) {
        scrolledFor.current = key;
        el.scrollIntoView({ block: "nearest" });
      }
      const r = el?.getBoundingClientRect();
      const next = r ? { top: r.top - 4, left: r.left - 4, width: r.width + 8, height: r.height + 8 } : null;
      setBox((b) =>
        b && next && Math.abs(b.top - next.top) < 1 && Math.abs(b.left - next.left) < 1 && Math.abs(b.width - next.width) < 1 && Math.abs(b.height - next.height) < 1
          ? b
          : next,
      );
      // Phones: a bottom card, flipped to the top when the anchor sits in the lower half (the composer).
      setPhoneTop(Boolean(r && r.top + r.height / 2 > window.innerHeight / 2 && window.innerWidth < 700));
      const h = cardRef.current?.offsetHeight ?? 220;
      const p = placeCard(next, h);
      setPos((o) => (Math.abs(o.top - p.top) < 1 && Math.abs(o.left - p.left) < 1 ? o : p));
    };
    update();
    const id = window.setInterval(update, 200);
    window.addEventListener("resize", update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", update);
    };
  }, [isTour, step, applied]);

  const busy = ag.anyChecking || ag.sendState.kind === "sending";
  const titleId = "tour-title";
  const bodyId = "tour-body";

  if (!isTour) {
    return (
      <>
        {box ? <div className={s.ring} style={box} aria-hidden="true" /> : null}
        <div ref={cardRef} className={cx(s.card, phoneTop && s.cardTop)} style={pos} role="dialog" aria-labelledby={titleId} aria-describedby={bodyId}>
          <div className={s.top}>
            <span className={s.counter}>Guided tour · 5 steps</span>
            <span className={s.spacer} />
            <button type="button" className={s.close} aria-label="Close tour offer" onClick={onClose}>
              <X aria-hidden="true" />
            </button>
          </div>
          <h2 ref={titleRef} id={titleId} className={s.title} tabIndex={-1}>
            New here? Take the 2-minute tour
          </h2>
          <p id={bodyId} className={s.body}>
            It walks through the demo script: catch a wrong promise, see why the rules decided, recover with the safe reply, handle an
            unknown rail and edit a source live. You can skip at any step.
          </p>
          <div className={s.nav}>
            <button type="button" className={cx(ui.btn, ui.sm, ui.ghost)} onClick={onClose}>
              Not now
            </button>
            <span className={s.spacer} />
            <button type="button" className={cx(ui.btn, ui.sm, ui.primary)} onClick={onStart}>
              <Compass aria-hidden="true" />
              Start tour
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!step) return null;
  const n = state.step + 1;
  const last = n === TOUR_STEPS;
  const t9001 = ag.ticket?.id === "TCK-9001";
  const blocked = t9001 && ag.sendState.kind === "blocked";
  const sent = t9001 && ag.sendState.kind === "sent";
  const hasSuggestion = t9001 && Boolean(ag.stored?.result.suggestion);

  return (
    <>
      {box ? <div className={s.ring} style={box} aria-hidden="true" /> : null}
      <div ref={cardRef} className={cx(s.card, phoneTop && s.cardTop)} style={pos} role="dialog" aria-labelledby={titleId} aria-describedby={bodyId}>
        <div className={s.top}>
          <span className={s.counter}>
            Step {n} of {TOUR_STEPS}
          </span>
          <span className={s.dots} aria-hidden="true">
            {STEPS.map((_, i) => (
              <span key={i} className={cx(s.dot, i <= state.step && s.dotOn)} />
            ))}
          </span>
          <button type="button" className={s.close} aria-label="Close tour" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        <h2 ref={titleRef} id={titleId} className={s.title} tabIndex={-1}>
          {step.title}
        </h2>
        <p id={bodyId} className={s.body}>
          {step.body}
        </p>

        {state.step === 2 ? (
          <div className={s.actions}>
            {sent ? (
              <span className={s.done}>
                <CircleCheck aria-hidden="true" />
                The safe reply was sent. One intercept is in Impact.
              </span>
            ) : blocked ? (
              <button
                type="button"
                className={cx(ui.btn, ui.sm, ui.primary)}
                disabled={busy || !hasSuggestion}
                onClick={() => {
                  ag.actions.applySafeReply();
                  void ag.actions.send();
                }}
              >
                Use the safe reply and send it
              </button>
            ) : (
              <button
                type="button"
                className={cx(ui.btn, ui.sm, ui.primary)}
                disabled={busy}
                onClick={() => {
                  if (!t9001 || ag.draft !== CANONICAL_DRAFT) ag.actions.prepareTicket("TCK-9001", CANONICAL_DRAFT);
                  void ag.actions.send();
                }}
              >
                Try to send the wrong draft
              </button>
            )}
          </div>
        ) : null}

        {state.step === 4 ? (
          <div className={s.actions}>
            {applied && !busy ? (
              <span className={s.done}>
                <CircleCheck aria-hidden="true" />
                DOC-103 v2 saved as a draft and the check reran.
              </span>
            ) : ag.overrides["DOC-103"] ? (
              <>
                <span className={s.note}>DOC-103 is already edited in this workspace, so the before/after won&apos;t show.</span>
                <button
                  type="button"
                  className={cx(ui.btn, ui.sm)}
                  disabled={busy}
                  onClick={() => ag.actions.restoreSource("DOC-103")}
                >
                  Restore DOC-103 to its seed version
                </button>
              </>
            ) : (
              <button
                type="button"
                className={cx(ui.btn, ui.sm, ui.primary)}
                disabled={busy}
                onClick={() => {
                  if (ag.actions.applyB7()) setApplied(true);
                  if (overlay) ag.actions.setPanelOpen(true);
                }}
              >
                Apply the edit (2 business days, Save draft)
              </button>
            )}
          </div>
        ) : null}

        {busy ? (
          <span className={s.busy} aria-live="polite">
            <span className={s.spin} aria-hidden="true" />
            Working…
          </span>
        ) : null}

        <div className={s.nav}>
          <button type="button" className={cx(ui.btn, ui.sm, ui.ghost)} onClick={onClose}>
            Skip tour
          </button>
          <span className={s.hint}>Esc to close</span>
          <span className={s.spacer} />
          {n > 1 ? (
            <button type="button" className={cx(ui.btn, ui.sm)} onClick={() => onStep(state.step - 1)}>
              <ArrowLeft aria-hidden="true" />
              Back
            </button>
          ) : null}
          <button
            type="button"
            className={cx(ui.btn, ui.sm, ui.primary)}
            onClick={() => (last ? onClose() : onStep(state.step + 1))}
          >
            {last ? "Finish" : "Next"}
            {last ? null : <ArrowRight aria-hidden="true" />}
          </button>
        </div>
      </div>
    </>
  );
}
