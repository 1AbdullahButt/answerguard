"use client";
import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, FileText, Hash, Pencil, RotateCcw, Search } from "lucide-react";
import type { Role, Source } from "@/lib/engine/types";
import { sourceChips } from "@/lib/client/format";
import type { OverrideMap } from "@/lib/client/workspace";
import type { SaveMode } from "@/lib/client/useAnswerGuard";
import { cx, ui } from "@/components/ui/atoms";
import { QuoteHighlight } from "./QuoteHighlight";
import { SignalChips } from "./SignalChips";
import { SourceEditor, type SourceEdit } from "./SourceEditor";
import s from "./panel.module.css";

/** Visible sources only (hidden ones are never rendered or counted), with an in-place editor. */
export function SourcesTab({
  role,
  sources,
  deleted,
  overrides,
  focus,
  onSave,
  onRemove,
  onRestore,
  onClearFocus,
}: {
  role: Role;
  sources: Source[];
  deleted: Source[];
  overrides: OverrideMap;
  focus: { sourceId: string; quote: string; nonce: number } | null;
  onSave: (source: Source, edit: SourceEdit, mode: SaveMode) => void;
  onRemove: (source: Source) => void;
  onRestore: (id: string) => void;
  onClearFocus: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const markRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // "Open in Sources": scroll to the doc with the quote highlighted (stays until another doc is opened).
  useEffect(() => {
    if (!focus) return;
    setEditing(null);
    setViewing(focus.sourceId);
    const t = window.setTimeout(() => {
      const target = markRef.current ?? rowRefs.current[focus.sourceId];
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 30);
    return () => window.clearTimeout(t);
  }, [focus]);

  const q = filter.trim().toLowerCase();
  const shown = sources.filter((x) => !q || `${x.id} ${x.title} ${x.kind} ${x.body}`.toLowerCase().includes(q));
  const persona = role === "ops_lead" ? "Ops lead" : "Support agent";

  return (
    <>
      <div className={s.filterRow}>
        <label className={s.filter}>
          <Search aria-hidden="true" />
          <span className="sr-only">Filter sources</span>
          <input type="search" placeholder="Filter sources" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </label>
        <span className={s.visibleN}>
          {sources.length} visible to {persona}
        </span>
      </div>

      {shown.map((src) => {
        const edited = overrides[src.id] !== undefined;
        if (editing === src.id) {
          return (
            <SourceEditor
              key={src.id + ":" + src.version}
              source={src}
              onCancel={() => setEditing(null)}
              onRemove={() => {
                setEditing(null);
                onRemove(src);
              }}
              onSave={(edit, mode) => {
                setEditing(null);
                onSave(src, edit, mode);
              }}
            />
          );
        }
        const KindIcon = src.kind === "slack" ? Hash : FileText;
        const isFocus = focus?.sourceId === src.id;
        const open = viewing === src.id;
        return (
          <section
            key={src.id}
            className={s.card}
            aria-label={src.title}
            ref={(el) => {
              rowRefs.current[src.id] = el as HTMLDivElement | null;
            }}
          >
            <div className={s.srcitem}>
              <KindIcon aria-hidden="true" />
              <div style={{ minWidth: 0 }}>
                <h3 className={s.srcTitle} title={src.title}>
                  {src.title}
                </h3>
                <SignalChips chips={sourceChips(src, edited)} label={`${src.id} signals`} />
              </div>
              <div className={s.srcActions}>
                <button type="button" className={cx(ui.btn, ui.sm, ui.ghost)} onClick={() => setEditing(src.id)} aria-label={`Edit ${src.id}`}>
                  <Pencil aria-hidden="true" />
                  Edit
                </button>
                <button
                  type="button"
                  className={cx(ui.btn, ui.sm, ui.ghost)}
                  aria-expanded={open}
                  aria-label={`${open ? "Hide" : "View"} ${src.id} text`}
                  onClick={() => {
                    if (open) {
                      setViewing(null);
                      if (isFocus) onClearFocus();
                    } else {
                      setViewing(src.id);
                      if (focus && !isFocus) onClearFocus();
                    }
                  }}
                >
                  {open ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                  {open ? "Hide" : "View"}
                </button>
              </div>
            </div>
            {open ? (
              <div className={cx(s.docView, isFocus && s.docFocus)} tabIndex={0} aria-label={`${src.id} text`}>
                {isFocus && focus ? (
                  <QuoteHighlight
                    text={src.body}
                    quote={focus.quote}
                    markRef={(el) => {
                      markRef.current = el;
                    }}
                  />
                ) : (
                  src.body
                )}
              </div>
            ) : null}
          </section>
        );
      })}

      {shown.length === 0 ? <p className={s.muted}>No visible source matches “{filter}”.</p> : null}

      {deleted.length > 0 ? (
        <>
          <div className={s.sect}>
            <h3>Removed in this browser</h3>
            <span className={s.line} />
          </div>
          {deleted.map((src) => (
            <section key={src.id} className={cx(s.card, s.removed)} aria-label={`${src.title} (removed)`}>
              <div className={s.srcitem}>
                <FileText aria-hidden="true" />
                <div style={{ minWidth: 0 }}>
                  <h3 className={cx(s.srcTitle, s.removedTitle)}>{src.title}</h3>
                  <span className={s.muted} style={{ fontSize: 12 }}>
                    {src.id} · not sent to checks
                  </span>
                </div>
                <button type="button" className={cx(ui.btn, ui.sm)} onClick={() => onRestore(src.id)}>
                  <RotateCcw aria-hidden="true" />
                  Restore
                </button>
              </div>
            </section>
          ))}
        </>
      ) : null}
    </>
  );
}
