"use client";
import { RotateCcw } from "lucide-react";
import type { AiRunInfo, Role } from "@/lib/engine/types";
import { cx, Mark, ui } from "@/components/ui/atoms";
import { AiModeBadge } from "./AiModeBadge";
import { RoleSwitch } from "./RoleSwitch";
import s from "./shell.module.css";

export function TopBar({
  role,
  onRole,
  onReset,
  ai,
}: {
  role: Role;
  onRole: (r: Role) => void;
  onReset: () => void;
  ai: AiRunInfo | null;
}) {
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
      <button type="button" className={cx(ui.btn, ui.ghost, ui.sm)} onClick={onReset} aria-label="Reset workspace">
        <RotateCcw aria-hidden="true" />
        <span className={s.resetLabel}>Reset workspace</span>
      </button>
      <AiModeBadge ai={ai} />
    </header>
  );
}
