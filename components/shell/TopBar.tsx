"use client";
import { forwardRef } from "react";
import { Compass, RotateCcw } from "lucide-react";
import type { AiRunInfo, Role } from "@/lib/engine/types";
import { cx, Mark, ui } from "@/components/ui/atoms";
import { AiModeBadge } from "./AiModeBadge";
import { RoleSwitch } from "./RoleSwitch";
import s from "./shell.module.css";

export const TopBar = forwardRef<
  HTMLButtonElement,
  { role: Role; onRole: (r: Role) => void; onReset: () => void; onTour: () => void; tourOpen: boolean; ai: AiRunInfo | null }
>(function TopBar({ role, onRole, onReset, onTour, tourOpen, ai }, tourRef) {
  return (
    <header className={s.topbar}>
      <div className={s.brand}>
        <span className={s.brandMark}>
          <Mark />
        </span>
        <b>AnswerGuard</b>
        <span className={s.brandSep} aria-hidden="true">
          ·
        </span>
        <span className={s.brandSub}>independent concept for Slite Agent</span>
      </div>
      <div className={s.spacer} />
      <RoleSwitch role={role} onChange={onRole} />
      <button
        ref={tourRef}
        type="button"
        className={cx(ui.btn, ui.ghost, ui.sm, s.iconOnly)}
        onClick={onTour}
        aria-label="Guided tour"
        aria-expanded={tourOpen}
        data-tour="tour-button"
      >
        <Compass aria-hidden="true" />
        <span className={s.resetLabel}>Guided tour</span>
      </button>
      <button type="button" className={cx(ui.btn, ui.ghost, ui.sm, s.iconOnly)} onClick={onReset} aria-label="Reset workspace">
        <RotateCcw aria-hidden="true" />
        <span className={s.resetLabel}>Reset workspace</span>
      </button>
      <AiModeBadge ai={ai} />
    </header>
  );
});
