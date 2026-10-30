"use client";
import { useState, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { cx, ui } from "@/components/ui/atoms";
import s from "./panel.module.css";

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?)\b|\b(true|false|null)\b/g;

function tint(json: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of json.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(json.slice(last, at));
    if (m[1] !== undefined) {
      out.push(
        <span key={i++} className={m[2] ? s.jk : s.js}>
          {m[1]}
        </span>,
      );
      if (m[2]) out.push(m[2]);
    } else {
      out.push(
        <span key={i++} className={s.jn}>
          {m[0]}
        </span>,
      );
    }
    last = at + m[0].length;
  }
  out.push(json.slice(last));
  return out;
}

/** Read-only, syntax-tinted JSON of the full CheckResult, plus Copy. */
export function RawJson({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2);
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <span className={s.sect} style={{ margin: 0 }}>
          <h3>Raw JSON</h3>
        </span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className={cx(ui.btn, ui.sm)}
          onClick={() => {
            try {
              void navigator.clipboard.writeText(json).then(() => setCopied(true));
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy aria-hidden="true" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={s.json} tabIndex={0} aria-label="Raw CheckResult JSON">
        {tint(json)}
      </pre>
    </div>
  );
}
