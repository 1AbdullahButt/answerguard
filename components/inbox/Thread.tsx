"use client";
import type { ReactNode } from "react";
import { ArrowLeft, Clock } from "lucide-react";
import type { Rail, Ticket } from "@/lib/engine/types";
import type { SentMessage } from "@/lib/client/useAnswerGuard";
import { cx, ui } from "@/components/ui/atoms";
import { RailSelect } from "./RailSelect";
import { initials, ticketMeta } from "./ticketMeta";
import s from "./inbox.module.css";

function hm(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function Thread({
  ticket,
  rail,
  onRail,
  sent,
  onBack,
  children,
}: {
  ticket: Ticket;
  rail: Rail;
  onRail: (r: Rail) => void;
  sent: SentMessage[];
  onBack: () => void;
  children: ReactNode;
}) {
  const meta = ticketMeta(ticket.id);
  return (
    <main className={s.thread} aria-label="Conversation">
      <div className={s.thH}>
        <div className={s.thTop}>
          <button type="button" className={cx(ui.iconbtn, s.back)} aria-label="Back to inbox" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
          </button>
          <h1>{ticket.customer}</h1>
          <span className={s.thTid}>{ticket.id}</span>
          <span className={s.tag}>Failed transfer</span>
          <div className={s.thActions} aria-hidden="true">
            <span className={cx(ui.btn, ui.sm)}>
              <Clock />
              Snooze
            </span>
            <span className={cx(ui.btn, ui.sm)}>Close</span>
          </div>
        </div>
        <div className={s.attrs}>
          <RailSelect value={rail} onChange={onRail} />
          <div className={s.attr}>
            <span className={s.attrK}>Transfer</span>
            <span className={cx(s.attrV, s.attrMono)}>{meta.transfer}</span>
          </div>
          <div className={s.attr}>
            <span className={s.attrK}>Channel</span>
            <span className={s.attrV}>Messenger</span>
          </div>
          <div className={s.attr}>
            <span className={s.attrK}>Created</span>
            <span className={s.attrV}>{meta.created}</span>
          </div>
          <div className={s.attr}>
            <span className={s.attrK}>Assignee</span>
            <span className={s.attrV}>
              <span className={cx(s.av, s.you)} aria-hidden="true">
                You
              </span>
              You
            </span>
          </div>
        </div>
      </div>
      <div className={s.msgs}>
        <div className={s.sys}>Today · conversation started via Messenger</div>
        <div className={s.msg}>
          <span className={cx(s.av, meta.avatarTone === "b" && s.avB, meta.avatarTone === "c" && s.avC)} aria-hidden="true">
            {initials(ticket.customer)}
          </span>
          <div>
            <div className={s.who}>
              <b>{ticket.customer}</b> · {meta.time}
            </div>
            <div className={s.bubble}>{ticket.message}</div>
          </div>
        </div>
        <div className={s.sys}>Synthetic customer · no real data</div>
        {sent.map((m, i) => (
          <div key={i} className={cx(s.msg, s.msgMine)}>
            <span className={cx(s.av, s.you)} aria-hidden="true">
              You
            </span>
            <div>
              <div className={s.who}>
                <b>You</b> · {hm(m.at)} · delivered (simulated)
              </div>
              <div className={cx(s.bubble, s.bubbleMine)}>{m.text}</div>
            </div>
          </div>
        ))}
      </div>
      {children}
    </main>
  );
}
