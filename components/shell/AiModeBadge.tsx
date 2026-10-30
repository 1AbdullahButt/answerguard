import type { AiRunInfo } from "@/lib/engine/types";
import { aiModeLabel } from "@/lib/client/format";
import { ModePill } from "@/components/ui/atoms";
import s from "./shell.module.css";

/** Top-bar AI mode badge. It tells the truth about the last check, never the configured mode. */
export function AiModeBadge({ ai }: { ai: AiRunInfo | null }) {
  const m = aiModeLabel(ai);
  const detail = ai ? `${m.text}${ai.model ? ` · ${ai.provider ? `${ai.provider} ` : ""}${ai.model}` : ""}` : m.text;
  return (
    <span className={s.modeWrap} role="status" aria-label={`AI mode: ${m.text}`} title={detail}>
      <ModePill ai={ai} />
    </span>
  );
}
