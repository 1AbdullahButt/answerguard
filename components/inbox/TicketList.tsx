"use client";
import { useRef, type KeyboardEvent } from "react";
import { Inbox } from "lucide-react";
import type { Rail, Ticket } from "@/lib/engine/types";
import type { StoredResult } from "@/lib/client/types";
import { cx, StatusPill } from "@/components/ui/atoms";
import { initials, RAIL_TAG, ticketMeta } from "./ticketMeta";
import s from "./inbox.module.css";

export function TicketList({
  tickets,
  selectedId,
  rails,
  results,
  isStale,
  onSelect,
}: {
  tickets: Ticket[];
  selectedId: string;
  rails: (id: string) => Rail;
  results: Record<string, StoredResult>;
  isStale: (id: string) => boolean;
  onSelect: (id: string) => void;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  // Arrow keys move between rows; Enter/Space opens (native button).
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let next = -1;
    if (e.key === "ArrowDown") next = Math.min(tickets.length - 1, i + 1);
    if (e.key === "ArrowUp") next = Math.max(0, i - 1);
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tickets.length - 1;
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
  };

  return (
    <nav className={s.tlist} aria-label="Inbox">
      <div className={s.tlistH}>
        <Inbox aria-hidden="true" />
        <h2>Inbox</h2>
        <span className={s.count}>{tickets.length}</span>
      </div>
      <div className={s.filters} aria-hidden="true">
        <span className={cx(s.chipf, s.chipfOn)}>Open · {tickets.length}</span>
        <span className={s.chipf}>Mine</span>
        <span className={s.chipf}>Snoozed</span>
      </div>
      <ul className={s.rows}>
        {tickets.map((t, i) => {
          const meta = ticketMeta(t.id);
          const r = rails(t.id);
          const res = results[t.id];
          const sel = t.id === selectedId;
          return (
            <li key={t.id}>
              <button
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                className={cx(s.ticket, sel && s.ticketSel)}
                aria-current={sel ? "true" : undefined}
                onClick={() => onSelect(t.id)}
                onKeyDown={(e) => onKey(e, i)}
                title={`${t.customer} · ${t.id}`}
              >
                <span className={cx(s.av, meta.avatarTone === "b" && s.avB, meta.avatarTone === "c" && s.avC)} aria-hidden="true">
                  {initials(t.customer)}
                </span>
                <span className={s.tBody}>
                  <span className={s.tTop}>
                    <span className={s.tName}>{t.customer}</span>
                    {res ? (
                      <span className={cx(s.tPill, isStale(t.id) && s.tStale)} title={isStale(t.id) ? "Result is stale: the draft or rail changed since this check" : undefined}>
                        <StatusPill decision={res.result.decision} small />
                        {isStale(t.id) ? <span className="sr-only"> (stale)</span> : null}
                      </span>
                    ) : (
                      <span className={s.tTime}>{meta.time}</span>
                    )}
                  </span>
                  <span className={s.tPrev} style={{ display: "block" }}>
                    {t.message}
                  </span>
                  <span className={s.tMeta}>
                    <span className={s.tId}>{t.id}</span>
                    <span className={cx(s.tag, r === "unknown" && s.tagOut)}>{RAIL_TAG[r]}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
