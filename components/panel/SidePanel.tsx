"use client";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { ChartColumn, Library, ListTree, Maximize2, Minimize2, RefreshCw, ShieldCheck, X } from "lucide-react";
import type { Tab } from "@/lib/client/types";
import { cx, Mark, ui } from "@/components/ui/atoms";
import s from "./panel.module.css";

const TABS: Array<{ id: Tab; label: string; Icon: typeof ShieldCheck }> = [
  { id: "check", label: "Check", Icon: ShieldCheck },
  { id: "reasoning", label: "Reasoning", Icon: ListTree },
  { id: "sources", label: "Sources", Icon: Library },
  { id: "impact", label: "Impact", Icon: ChartColumn },
];

export const DISCLAIMER = "Independent concept for Slite Agent · synthetic data · not affiliated with Slite";

/**
 * The Slite-style side panel. A normal component in the grid at ≥1100 px, a slide-over below that, and a bottom
 * sheet below 700 px (DESIGN.md §3). In overlay modes focus is trapped while open and Esc closes it.
 */
export function SidePanel({
  tab,
  onTab,
  sourceCount,
  overlay,
  open,
  full,
  onToggleFull,
  onClose,
  onRecheck,
  canRecheck,
  children,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  sourceCount: number;
  overlay: boolean;
  open: boolean;
  full: boolean;
  onToggleFull: () => void;
  onClose: () => void;
  onRecheck: () => void;
  canRecheck: boolean;
  children: ReactNode;
}) {
  const base = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const asideRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Overlay: move focus in when opened, trap Tab, Esc closes. Focus returns to the trigger (handled by App).
  useEffect(() => {
    if (!overlay || !open) return;
    const t = window.setTimeout(() => {
      const first = asideRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      first?.focus();
    }, 50);
    return () => window.clearTimeout(t);
  }, [overlay, open]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  const onAsideKey = (e: KeyboardEvent<HTMLElement>) => {
    if (!overlay || !open) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !asideRef.current) return;
    const items = Array.from(
      asideRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => el.offsetParent !== null);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const t = TABS[next];
    if (t) {
      onTab(t.id);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <aside
      ref={asideRef}
      className={cx(s.panel, open && s.panelOpen, full && s.panelFull)}
      aria-label="Slite Agent · AnswerGuard"
      onKeyDown={onAsideKey}
    >
      <div className={s.pH}>
        <span className={s.grab} aria-hidden="true" />
        <Mark small />
        <h2 className={s.ttl}>
          Slite Agent <span>· AnswerGuard</span>
        </h2>
        <span className={s.spacer} />
        <button type="button" className={ui.iconbtn} aria-label="Recheck" onClick={onRecheck} disabled={!canRecheck}>
          <RefreshCw aria-hidden="true" />
        </button>
        <button type="button" className={cx(ui.iconbtn, s.expandBtn)} aria-label={full ? "Shrink panel" : "Expand panel"} onClick={onToggleFull}>
          {full ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
        </button>
        <button type="button" className={cx(ui.iconbtn, s.closeBtn)} aria-label="Close panel" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </div>
      <div className={s.tabs} role="tablist" aria-label="AnswerGuard views">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={s.tab}
            onClick={() => onTab(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            <t.Icon aria-hidden="true" />
            {t.label}
            {t.id === "sources" ? (
              <span className={s.n} aria-hidden="true">
                {sourceCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {TABS.map((t) => (
        <div
          key={t.id}
          ref={tab === t.id ? bodyRef : undefined}
          id={`${base}-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${t.id}`}
          className={s.pBody}
          hidden={tab !== t.id}
          tabIndex={0}
        >
          {tab === t.id ? children : null}
        </div>
      ))}
    </aside>
  );
}
