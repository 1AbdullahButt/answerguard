import {
  BadgeCheck,
  CalendarClock,
  CircleArrowUp,
  CircleCheck,
  CloudOff,
  EyeOff,
  Flag,
  Hash,
  OctagonAlert,
  Pause,
  PenLine,
  Scale,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  User,
  type LucideIcon,
} from "lucide-react";
import type { OverallDecision } from "@/lib/engine/types";
import type { AiRunInfo } from "@/lib/engine/types";
import { aiModeLabel, DECISION_META, type Chip, type Tone } from "@/lib/client/format";
import s from "./ui.module.css";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const TONE_ICON: Record<Tone, LucideIcon> = {
  allow: CircleCheck,
  caution: TriangleAlert,
  hold: OctagonAlert,
  esc: CircleArrowUp,
  off: CloudOff,
};

export const toneClass: Record<Tone, string> = {
  allow: s.allow ?? "",
  caution: s.caution ?? "",
  hold: s.hold ?? "",
  esc: s.esc ?? "",
  off: s.off ?? "",
};

/** Status pill: icon + label + colour, never colour alone. */
export function StatusPill({ decision, small, suffix }: { decision: OverallDecision; small?: boolean; suffix?: string }) {
  const meta = DECISION_META[decision];
  const Icon = TONE_ICON[meta.tone];
  return (
    <span className={cx(s.st, small && s.stSmall, toneClass[meta.tone])}>
      <Icon aria-hidden="true" />
      {meta.label}
      {suffix}
    </span>
  );
}

export function AiLabel() {
  return (
    <span className={cx(s.lab, s.labAi)}>
      <Sparkles aria-hidden="true" />
      AI extracted
    </span>
  );
}

export function RuleLabel() {
  return (
    <span className={cx(s.lab, s.labRule)}>
      <Scale aria-hidden="true" />
      Rule
    </span>
  );
}

const CHIP_ICON: Record<Chip["icon"], LucideIcon | null> = {
  verified: BadgeCheck,
  owner: User,
  calendar: CalendarClock,
  rail: null,
  edit: PenLine,
  flag: Flag,
  informal: Hash,
  eyeoff: EyeOff,
  none: null,
};

export function SignalChip({ chip }: { chip: Chip }) {
  const Icon = CHIP_ICON[chip.icon];
  return (
    <span
      className={cx(s.chip, chip.tone === "ok" && s.chipOk, chip.tone === "warn" && s.chipWarn, chip.tone === "bad" && s.chipBad)}
      title={chip.text}
    >
      {Icon ? <Icon aria-hidden="true" /> : null}
      {chip.text}
    </span>
  );
}

export function Mark({ small }: { small?: boolean }) {
  return (
    <span className={cx(s.mark, small && s.markSmall)} aria-hidden="true">
      <ShieldCheck />
    </span>
  );
}

/** The AI mode pill. It always describes the last check, never the configuration. */
export function ModePill({ ai, small }: { ai: AiRunInfo | null; small?: boolean }) {
  const m = aiModeLabel(ai);
  const dot = { live: s.dotLive, saved: s.dotSaved, off: s.dotOff, none: s.dotNone, paused: "" }[m.dot];
  return (
    <span className={cx(s.modebadge, small && s.modebadgeSmall, m.dot === "paused" && s.modePaused)}>
      {m.dot === "paused" ? <Pause aria-hidden="true" /> : <span className={cx(s.dot, dot)} aria-hidden="true" />}
      <span className={s.modeText}>{m.text}</span>
      <span className={s.modeShort} aria-hidden="true">
        {m.short}
      </span>
    </span>
  );
}

export const ui = s;
