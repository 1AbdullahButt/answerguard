import type { Chip } from "@/lib/client/format";
import { SignalChip, ui } from "@/components/ui/atoms";

/** Source signals from metadata (never from the AI). Weakeners amber, exclusion reasons red. */
export function SignalChips({ chips, label }: { chips: Chip[]; label?: string }) {
  return (
    <span className={ui.chips} role="list" aria-label={label ?? "Signals"}>
      {chips.map((c, i) => (
        <span role="listitem" key={i} style={{ display: "inline-flex", maxWidth: "100%" }}>
          <SignalChip chip={c} />
        </span>
      ))}
    </span>
  );
}
