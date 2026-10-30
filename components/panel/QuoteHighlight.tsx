import type { ReactNode } from "react";
import { findRange } from "@/lib/client/format";
import s from "./panel.module.css";

/**
 * Renders `text` with `quote` highlighted (yellow = verbatim quote, nothing else).
 * With `context`, only an excerpt around the quote is shown.
 */
export function QuoteHighlight({
  text,
  quote,
  context,
  markRef,
}: {
  text: string;
  quote: string;
  context?: number;
  markRef?: (el: HTMLElement | null) => void;
}): ReactNode {
  const r = findRange(text, quote);
  if (!r) return <mark ref={markRef}>{quote}</mark>;
  let from = 0;
  let to = text.length;
  if (context !== undefined) {
    from = Math.max(0, r.start - context);
    to = Math.min(text.length, r.end + context);
    // snap to word boundaries
    if (from > 0) {
      const sp = text.indexOf(" ", from);
      if (sp > 0 && sp < r.start) from = sp + 1;
    }
    if (to < text.length) {
      const sp = text.lastIndexOf(" ", to);
      if (sp > r.end) to = sp;
    }
  }
  const before = text.slice(from, r.start);
  const after = text.slice(r.end, to);
  const clean = (x: string) => (context !== undefined ? x.replace(/\s+/g, " ").replace(/[#*]+\s?/g, "") : x);
  return (
    <>
      {from > 0 ? <span className={s.ctx}>… </span> : null}
      <span className={s.ctx}>{clean(before)}</span>
      <mark ref={markRef}>{text.slice(r.start, r.end)}</mark>
      <span className={s.ctx}>{clean(after)}</span>
      {to < text.length ? <span className={s.ctx}> …</span> : null}
    </>
  );
}
