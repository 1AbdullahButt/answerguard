"use client";
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import type { Rail } from "@/lib/engine/types";
import { RAIL_LABEL } from "./ticketMeta";
import s from "./inbox.module.css";

/** The ticket's rail. Changing it marks the current result stale; it never reruns the check by itself (D-021). */
export function RailSelect({ value, onChange }: { value: Rail; onChange: (r: Rail) => void }) {
  const id = useId();
  return (
    <div className={s.attr}>
      <label className={s.attrK} htmlFor={id}>
        Rail
      </label>
      <span className={s.attrV}>
        <span className={s.selectWrap}>
          <select id={id} className={s.select} value={value} onChange={(e) => onChange(e.target.value as Rail)}>
            {(Object.keys(RAIL_LABEL) as Rail[]).map((r) => (
              <option key={r} value={r}>
                {RAIL_LABEL[r]}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </span>
      </span>
    </div>
  );
}
