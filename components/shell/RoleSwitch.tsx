"use client";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Info, User } from "lucide-react";
import type { Role } from "@/lib/engine/types";
import { cx, ui } from "@/components/ui/atoms";
import s from "./shell.module.css";

export const PERSONA_NOTE =
  "Simulated personas. Anyone can switch. DOC-105 is synthetic. Never use this design with real restricted data.";

const OPTIONS: Array<{ role: Role; label: string }> = [
  { role: "support_agent", label: "Support agent" },
  { role: "ops_lead", label: "Ops lead" },
];

/** Persona switch (SPEC §8): a radiogroup, not access control. Arrow keys move and select. */
export function RoleSwitch({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  const tipId = useId();
  const [tip, setTip] = useState(false);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = OPTIONS.findIndex((o) => o.role === role);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % OPTIONS.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + OPTIONS.length) % OPTIONS.length;
    if (next < 0) return;
    e.preventDefault();
    const opt = OPTIONS[next];
    if (opt) {
      onChange(opt.role);
      refs.current[next]?.focus();
    }
  };

  return (
    <div className={s.persona}>
      <span className={s.personaLbl} aria-hidden="true">
        Viewing as
      </span>
      <div className={s.seg} role="radiogroup" aria-label="Persona" aria-describedby={tipId} onKeyDown={onKey}>
        {OPTIONS.map((o, i) => (
          <button
            key={o.role}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={role === o.role}
            tabIndex={role === o.role ? 0 : -1}
            onClick={() => onChange(o.role)}
          >
            {o.role === "support_agent" ? <User aria-hidden="true" /> : null}
            {o.label}
          </button>
        ))}
      </div>
      <span className={s.infoWrap} onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}>
        <button
          type="button"
          className={ui.iconbtn}
          aria-label="About personas"
          aria-describedby={tipId}
          onFocus={() => setTip(true)}
          onBlur={() => setTip(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && tip) {
              e.preventDefault(); // handled here: the guided tour must not close too
              setTip(false);
            }
          }}
          onClick={() => setTip((t) => !t)}
        >
          <Info aria-hidden="true" />
        </button>
        <span id={tipId} role="tooltip" className={cx(s.tooltip, tip && s.tooltipOn)}>
          {PERSONA_NOTE}
        </span>
      </span>
    </div>
  );
}
