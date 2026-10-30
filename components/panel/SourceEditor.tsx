"use client";
import { useEffect, useId, useRef, useState } from "react";
import { BadgeCheck, FileText, GitCompare, Hash, Info, Lock, Pencil, Trash, TriangleAlert } from "lucide-react";
import type { Source } from "@/lib/engine/types";
import { diffSummary, effectiveFromText, shortDate } from "@/lib/client/format";
import type { SaveMode } from "@/lib/client/useAnswerGuard";
import { cx, ui } from "@/components/ui/atoms";
import s from "./panel.module.css";

const MAX_DOC = 4000;

export interface SourceEdit {
  body: string;
  verification: Source["verification"];
  flaggedOutdated: boolean;
  ownerActive: boolean;
}

function Switch({ checked, onChange, label, text }: { checked: boolean; onChange: (v: boolean) => void; label: string; text: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={ui.switch} onClick={() => onChange(!checked)}>
      <span className={ui.sw} aria-hidden="true" />
      <span>{text}</span>
    </button>
  );
}

/**
 * Edit a source's text and signals (SPEC §9). Save draft = text only (a verified doc gets EDITED_AFTER_VERIFICATION).
 * Save and verify (simulated) = text + verified now. The effective date can only change through the text.
 */
export function SourceEditor({
  source,
  onSave,
  onCancel,
  onRemove,
}: {
  source: Source;
  onSave: (edit: SourceEdit, mode: SaveMode) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const [body, setBody] = useState(source.body);
  const [verification, setVerification] = useState(source.verification);
  const [flagged, setFlagged] = useState(source.flaggedOutdated);
  const [ownerActive, setOwnerActive] = useState(source.owner?.active ?? true);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const textId = useId();
  const verId = useId();

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  const dirty =
    body !== source.body ||
    verification !== source.verification ||
    flagged !== source.flaggedOutdated ||
    ownerActive !== (source.owner?.active ?? true);
  const diff = diffSummary(source.body, body);
  const effective = effectiveFromText(body);
  const KindIcon = source.kind === "slack" ? Hash : FileText;
  const edit: SourceEdit = { body, verification, flaggedOutdated: flagged, ownerActive };
  const verifiedNote =
    source.verification === "verified" && source.verifiedAt && body !== source.body
      ? `Save draft keeps the ${shortDate(source.verifiedAt)} verification, so ${source.id} gets Edited after verification.`
      : null;

  return (
    <section className={cx(s.card, s.editor)} aria-label={`Editing ${source.title}`}>
      <div className={s.edH}>
        <KindIcon aria-hidden="true" />
        <div className={s.edTt}>
          <h3 className={s.edTitle} title={source.title}>
            {source.title}
          </h3>
          <div className={s.edSub}>
            {source.id} · {source.kind.replace("_", " ")}
            {source.owner ? ` · ${source.owner.name}` : ""}
          </div>
        </div>
        <span className={s.verChip}>
          <Pencil aria-hidden="true" />
          {dirty ? `v${source.version} → v${source.version + 1} · unsaved` : `v${source.version}`}
        </span>
      </div>
      <div className={s.edBody}>
        <label htmlFor={textId} className="sr-only">
          {source.id} text
        </label>
        <textarea
          ref={textRef}
          id={textId}
          className={s.edText}
          value={body}
          maxLength={MAX_DOC}
          spellCheck={false}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className={s.diffRow}>
          <GitCompare aria-hidden="true" />
          {diff ? (
            <>
              <span>1 change</span>
              {diff.removed ? <span className={s.del}>{diff.removed}</span> : null}
              <span aria-hidden="true">→</span>
              {diff.added ? <span className={s.ins}>{diff.added}</span> : <span>(removed)</span>}
            </>
          ) : (
            <span>No text changes</span>
          )}
          <span className={s.counter}>
            {body.length.toLocaleString("en-US")} / {MAX_DOC.toLocaleString("en-US")}
          </span>
        </div>

        <div className={s.field}>
          <label className={s.fieldK} htmlFor={verId}>
            Verification
          </label>
          <span className={s.fieldV}>
            <select id={verId} className={s.edSelect} value={verification} onChange={(e) => setVerification(e.target.value as Source["verification"])}>
              <option value="verified">Verified{source.verifiedAt ? ` · ${shortDate(source.verifiedAt)}` : ""}</option>
              <option value="unverified">Unverified</option>
              <option value="expired">Expired</option>
            </select>
          </span>
        </div>
        {source.owner ? (
          <div className={s.field}>
            <span className={s.fieldK}>Owner active</span>
            <span className={s.fieldV}>
              <Switch checked={ownerActive} onChange={setOwnerActive} label="Owner active" text={source.owner.name} />
            </span>
          </div>
        ) : null}
        <div className={s.field}>
          <span className={s.fieldK}>Flagged outdated</span>
          <span className={s.fieldV}>
            <Switch checked={flagged} onChange={setFlagged} label="Flagged outdated" text={flagged ? "Flagged" : "Not flagged"} />
          </span>
        </div>
        <div className={s.field}>
          <span className={s.fieldK}>Effective date</span>
          <span className={s.fieldV}>
            <span>{effective ?? "None in the text"}</span>
            <span className={s.muted}>(from the text)</span>
          </span>
        </div>
        <div className={s.field}>
          <span className={s.fieldK}>Visibility</span>
          <span className={s.fieldV}>
            <Lock aria-hidden="true" style={{ width: 13, height: 13, color: "var(--muted)" }} />
            <span>{source.visibility === "ops" ? "Ops only" : "Everyone"}</span>
            <span className={s.muted}>(seed only)</span>
          </span>
        </div>
        <div className={s.field}>
          <span className={s.fieldK}>Workspace</span>
          <span className={s.fieldV}>
            <button type="button" className={cx(ui.btn, ui.sm, ui.ghost)} onClick={onRemove}>
              <Trash aria-hidden="true" />
              Remove from workspace
            </button>
          </span>
        </div>
      </div>
      <div className={s.pActions} style={{ position: "sticky", bottom: -16, borderRadius: "0 0 8px 8px" }}>
        <div className={s.edActions}>
          <button type="button" className={cx(ui.btn, ui.primary, s.btnBig)} disabled={!dirty} onClick={() => onSave(edit, "draft")}>
            Save draft
          </button>
          <button type="button" className={cx(ui.btn, s.btnBig)} onClick={() => onSave(edit, "verify")}>
            <BadgeCheck aria-hidden="true" />
            Save and verify (simulated)
          </button>
          <button type="button" className={cx(ui.btn, ui.ghost, s.cancel, s.btnBig)} onClick={onCancel}>
            Cancel
          </button>
        </div>
        {verifiedNote ? (
          <p className={cx(s.fine, s.fineWarn)}>
            <TriangleAlert aria-hidden="true" />
            <span>{verifiedNote}</span>
          </p>
        ) : null}
        <p className={s.fine}>
          <Info aria-hidden="true" />
          <span>
            In Slite, only the doc&apos;s owner or an admin verifies. <b>Save and verify</b> simulates that step. Both save and rerun the check.
          </span>
        </p>
      </div>
    </section>
  );
}
