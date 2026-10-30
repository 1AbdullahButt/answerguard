"use client";
// Client state for the demo shell: seed, tickets, drafts, rails, workspace overrides, checks, sends, metrics.
// The server is the source of truth for decisions; this hook only orchestrates requests and remembers results.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CheckResult, Rail, Role, Source, Ticket } from "@/lib/engine/types";
import { mergeOverrides } from "@/lib/workspace/merge";
import { ApiError, fetchSeed, postCheck, postSend, type CheckRequest } from "./api";
import {
  clearMetrics,
  emptyMetrics,
  loadMetrics,
  recordCheck,
  recordIntercept,
  saveMetrics,
  setReview,
  type Metrics,
  type Review,
} from "./metrics";
import type { CheckKey, OverrideRecord, SeedResponse, StaleReason, StoredResult, Tab } from "./types";
import { DECISION_META } from "./format";
import {
  clearOverrides,
  loadOverrides,
  saveOverrides,
  toRequestOverrides,
  workspaceKey,
  type OverrideMap,
} from "./workspace";

export type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "blocked"; result: CheckResult }
  | { kind: "ack_required"; result: CheckResult }
  | { kind: "unavailable"; result: CheckResult }
  | { kind: "sent"; customer: string };

export interface SentMessage {
  text: string;
  at: string;
}

export interface CheckingState {
  ticketId: string;
  step: 0 | 1 | 2;
  sourceCount: number;
}

export interface Toast {
  id: number;
  message: string;
}

export type SaveMode = "draft" | "verify";

function nowIso(): string {
  return new Date().toISOString();
}

export function useAnswerGuard() {
  const [role, setRole] = useState<Role>("support_agent");
  const [seed, setSeed] = useState<SeedResponse | null>(null);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [rails, setRails] = useState<Record<string, Rail>>({});
  const [sent, setSent] = useState<Record<string, SentMessage[]>>({});
  const [overrides, setOverrides] = useState<OverrideMap>({});
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [results, setResults] = useState<Record<string, StoredResult>>({});
  const [checking, setChecking] = useState<CheckingState | null>(null);
  const [sendStates, setSendStates] = useState<Record<string, SendState>>({});
  const [acks, setAcks] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<Tab>("check");
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [sourceFocus, setSourceFocus] = useState<{ sourceId: string; quote: string; nonce: number } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pausedDismissed, setPausedDismissed] = useState(false);
  const [lastAi, setLastAi] = useState<CheckResult["ai"] | null>(null);

  // Latest values for async callbacks.
  const ref = useRef({ role, seed, selectedId, drafts, rails, overrides, metrics, results });
  ref.current = { role, seed, selectedId, drafts, rails, overrides, metrics, results };
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<number[]>([]);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  // ---- load browser state (after mount, so SSR and the first client render match) -----------------
  useEffect(() => {
    setOverrides(loadOverrides());
    setMetrics(loadMetrics());
  }, []);

  const updateMetrics = useCallback((fn: (m: Metrics) => Metrics) => {
    setMetrics((m) => {
      const next = fn(m);
      saveMetrics(next);
      return next;
    });
  }, []);

  // ---- seed ---------------------------------------------------------------------------------------
  const loadSeed = useCallback(
    async (forRole: Role) => {
      setSeedError(null);
      try {
        const data = await fetchSeed(forRole);
        setSeed(data);
        setDrafts((d) => {
          const next = { ...d };
          for (const t of data.tickets) if (next[t.id] === undefined) next[t.id] = t.draft;
          return next;
        });
        setRails((r) => {
          const next = { ...r };
          for (const t of data.tickets) if (next[t.id] === undefined) next[t.id] = t.rail;
          return next;
        });
        setSelectedId((id) => id || data.tickets[0]?.id || "");
        return data;
      } catch (e) {
        setSeedError(e instanceof Error ? e.message : String(e));
        return null;
      }
    },
    [],
  );

  useEffect(() => {
    void loadSeed("support_agent");
  }, [loadSeed]);

  // ---- derived ------------------------------------------------------------------------------------
  const tickets: Ticket[] = seed?.tickets ?? [];
  const ticket = tickets.find((t) => t.id === selectedId) ?? null;
  const draft = ticket ? (drafts[ticket.id] ?? "") : "";
  const rail: Rail = ticket ? (rails[ticket.id] ?? ticket.rail) : "unknown";
  const wsKey = useMemo(() => workspaceKey(overrides), [overrides]);

  /** Seed sources visible to the persona, with this browser's edits merged (deleted ones kept separately). */
  const effectiveSources: Source[] = useMemo(
    () => mergeOverrides(seed?.sources ?? [], toRequestOverrides(overrides)),
    [seed, overrides],
  );
  const deletedSources: Source[] = useMemo(
    () => (seed?.sources ?? []).filter((s) => overrides[s.id]?.deleted),
    [seed, overrides],
  );
  const editedCount = Object.keys(overrides).length;

  const stored = ticket ? (results[ticket.id] ?? null) : null;
  const staleReason: StaleReason = useMemo(() => {
    if (!stored || !ticket) return null;
    const k = stored.key;
    if (k.draft !== draft) return "draft";
    if (k.rail !== rail) return "rail";
    if (k.role !== role) return "persona";
    if (k.workspace !== wsKey) return "workspace";
    return null;
  }, [stored, ticket, draft, rail, role, wsKey]);

  const railOf = (id: string): Rail => rails[id] ?? tickets.find((t) => t.id === id)?.rail ?? "unknown";
  /** Whether a ticket's last result no longer matches its current draft, rail, persona or workspace. */
  const isStale = (id: string): boolean => {
    const r = results[id];
    if (!r) return false;
    const k = r.key;
    return k.draft !== (drafts[id] ?? "") || k.rail !== railOf(id) || k.role !== role || k.workspace !== wsKey;
  };

  const sendState: SendState = ticket ? (sendStates[ticket.id] ?? { kind: "idle" }) : { kind: "idle" };
  const ack = ticket ? (acks[ticket.id] ?? false) : false;

  // ---- check --------------------------------------------------------------------------------------
  const clearTimers = () => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  };

  const buildRequest = useCallback(
    (over?: { overrides?: OverrideMap; role?: Role; ticketId?: string }): { req: CheckRequest; key: CheckKey } | null => {
      const st = ref.current;
      const ticketId = over?.ticketId ?? st.selectedId;
      const t = st.seed?.tickets.find((x) => x.id === ticketId);
      if (!t) return null;
      const ov = over?.overrides ?? st.overrides;
      const r = over?.role ?? st.role;
      const req: CheckRequest = {
        ticketId,
        rail: st.rails[ticketId] ?? t.rail,
        draft: st.drafts[ticketId] ?? "",
        role: r,
        overrides: toRequestOverrides(ov),
      };
      return { req, key: { ticketId, rail: req.rail, draft: req.draft, role: r, workspace: workspaceKey(ov) } };
    },
    [],
  );

  const storeResult = useCallback(
    (key: CheckKey, result: CheckResult, because: string | null) => {
      setResults((prev) => {
        const old = prev[key.ticketId];
        const changedFrom =
          because && old && old.result.decision !== result.decision ? { decision: old.result.decision, because } : null;
        return { ...prev, [key.ticketId]: { key, result, changedFrom } };
      });
      setLastAi(result.ai);
      if (result.ai.paused) setPausedDismissed(false);
      const t = ref.current.seed?.tickets.find((x) => x.id === key.ticketId);
      updateMetrics((m) => recordCheck(m, key.ticketId, t?.customer ?? key.ticketId, key.draft, result, nowIso()));
    },
    [updateMetrics],
  );

  const runCheck = useCallback(
    async (opts?: { overrides?: OverrideMap; role?: Role; because?: string }) => {
      const built = buildRequest(opts);
      if (!built) return;
      const { req, key } = built;
      if (!req.draft.trim()) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      clearTimers();
      const visibleCount = mergeOverrides(ref.current.seed?.sources ?? [], req.overrides).length;
      setChecking({ ticketId: key.ticketId, step: 0, sourceCount: visibleCount });
      // An honest client-side sequence: the server does these steps in this order inside one request.
      timersRef.current.push(
        window.setTimeout(() => setChecking((c) => (c && c.ticketId === key.ticketId ? { ...c, step: 1 } : c)), 350),
        window.setTimeout(() => setChecking((c) => (c && c.ticketId === key.ticketId ? { ...c, step: 2 } : c)), 900),
      );
      setSendStates((s) => ({ ...s, [key.ticketId]: s[key.ticketId]?.kind === "sent" ? { kind: "idle" } : (s[key.ticketId] ?? { kind: "idle" }) }));
      try {
        const result = await postCheck(req, controller.signal);
        if (controller.signal.aborted) return;
        storeResult(key, result, opts?.because ?? null);
        // A fresh check supersedes any earlier send outcome for this ticket (blocked, ack, unavailable).
        setSendStates((st) => (st[key.ticketId] && st[key.ticketId]?.kind !== "sending" ? { ...st, [key.ticketId]: { kind: "idle" } } : st));
      } catch (e) {
        if (controller.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
        const msg =
          e instanceof ApiError && e.status === 429
            ? "Too many checks right now. Wait a moment and try again."
            : `Check failed: ${e instanceof Error ? e.message : String(e)}`;
        showToast(msg);
      } finally {
        if (abortRef.current === controller) {
          clearTimers();
          setChecking(null);
          abortRef.current = null;
        }
      }
    },
    [buildRequest, storeResult, showToast],
  );

  useEffect(() => () => clearTimers(), []);

  // ---- send ---------------------------------------------------------------------------------------
  const send = useCallback(async () => {
    const built = buildRequest();
    if (!built) return;
    const { req, key } = built;
    if (!req.draft.trim()) return;
    const ticketId = key.ticketId;
    const acknowledged = acks[ticketId] ?? false;
    setSendStates((s) => ({ ...s, [ticketId]: { kind: "sending" } }));
    try {
      const out = await postSend({ ...req, acknowledged });
      storeResult(key, out.result, null);
      if (out.kind === "sent") {
        const customer = ref.current.seed?.tickets.find((t) => t.id === ticketId)?.customer ?? "the customer";
        setSent((s) => ({ ...s, [ticketId]: [...(s[ticketId] ?? []), { text: req.draft, at: nowIso() }] }));
        setDrafts((d) => ({ ...d, [ticketId]: "" }));
        setAcks((a) => ({ ...a, [ticketId]: false }));
        setSendStates((s) => ({ ...s, [ticketId]: { kind: "sent", customer } }));
      } else if (out.kind === "blocked") {
        updateMetrics(recordIntercept);
        setSendStates((s) => ({ ...s, [ticketId]: { kind: "blocked", result: out.result } }));
      } else if (out.kind === "ack_required") {
        setSendStates((s) => ({ ...s, [ticketId]: { kind: "ack_required", result: out.result } }));
      } else {
        setSendStates((s) => ({ ...s, [ticketId]: { kind: "unavailable", result: out.result } }));
      }
    } catch (e) {
      setSendStates((s) => ({ ...s, [ticketId]: { kind: "idle" } }));
      showToast(`Send failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [acks, buildRequest, storeResult, updateMetrics, showToast]);

  // ---- editing ------------------------------------------------------------------------------------
  const setDraft = useCallback((text: string) => {
    const id = ref.current.selectedId;
    if (!id) return;
    setDrafts((d) => ({ ...d, [id]: text }));
    setSendStates((s) => (s[id] && s[id]?.kind !== "idle" && s[id]?.kind !== "sending" ? { ...s, [id]: { kind: "idle" } } : s));
    setAcks((a) => (a[id] ? { ...a, [id]: false } : a));
  }, []);

  const setRail = useCallback((r: Rail) => {
    const id = ref.current.selectedId;
    if (!id) return;
    // D-021: a rail change marks the result stale; it does not rerun automatically.
    setRails((x) => ({ ...x, [id]: r }));
  }, []);

  const setAck = useCallback((v: boolean) => {
    const id = ref.current.selectedId;
    if (id) setAcks((a) => ({ ...a, [id]: v }));
  }, []);

  const selectTicket = useCallback((id: string) => {
    setSelectedId(id);
    setMobileView("thread");
  }, []);

  const applySafeReply = useCallback(() => {
    const id = ref.current.selectedId;
    const r = ref.current.results[id]?.result;
    if (r?.suggestion) setDraft(r.suggestion.text);
  }, [setDraft]);

  const switchRole = useCallback(
    async (r: Role) => {
      if (r === ref.current.role) return;
      setRole(r);
      const data = await loadSeed(r);
      if (!data) return;
      // Switching persona reruns the check (DESIGN.md RoleSwitch) when this ticket already has a result.
      const id = ref.current.selectedId;
      if (ref.current.results[id] && (ref.current.drafts[id] ?? "").trim()) {
        ref.current.seed = data;
        void runCheck({ role: r, because: `persona switched to ${r === "ops_lead" ? "Ops lead" : "Support agent"}` });
      }
    },
    [loadSeed, runCheck],
  );

  const commitOverrides = useCallback((next: OverrideMap) => {
    saveOverrides(next);
    setOverrides(next);
    ref.current.overrides = next;
  }, []);

  /** Sources editor save (SPEC §9). Save draft: text only. Save and verify (simulated): text + verified now. */
  const saveSource = useCallback(
    (source: Source, edit: { body: string; verification: Source["verification"]; flaggedOutdated: boolean; ownerActive: boolean }, mode: SaveMode) => {
      const now = nowIso();
      const prev = ref.current.overrides[source.id];
      const bodyChanged = edit.body !== source.body;
      const version = bodyChanged || mode === "verify" ? source.version + 1 : source.version;
      let verification = edit.verification;
      let verifiedAt = source.verifiedAt;
      if (mode === "verify") {
        verification = "verified";
        verifiedAt = now;
      } else if (edit.verification !== source.verification && edit.verification === "verified") {
        verifiedAt = now; // the status select is a simulated governance toggle, like Save and verify
      }
      const rec: OverrideRecord = {
        id: source.id,
        body: edit.body,
        version,
        updatedAt: bodyChanged ? now : (prev?.updatedAt ?? source.updatedAt),
        verification,
        verifiedAt,
        flaggedOutdated: edit.flaggedOutdated,
        ownerActive: edit.ownerActive,
        deleted: false,
      };
      // Verifying "now" must not leave updatedAt later than verifiedAt.
      if (mode === "verify") rec.updatedAt = now;
      const next = { ...ref.current.overrides, [source.id]: rec };
      commitOverrides(next);
      setTab("check");
      const because = `${source.id} v${version} ${mode === "verify" ? "saved and verified (simulated)" : "saved as a draft"}`;
      void runCheck({ overrides: next, because });
    },
    [commitOverrides, runCheck],
  );

  const deleteSource = useCallback(
    (source: Source) => {
      const base = ref.current.overrides[source.id];
      const rec: OverrideRecord = base
        ? { ...base, deleted: true }
        : {
            id: source.id,
            body: source.body,
            version: source.version,
            updatedAt: source.updatedAt,
            verification: source.verification,
            verifiedAt: source.verifiedAt,
            flaggedOutdated: source.flaggedOutdated,
            ownerActive: source.owner?.active ?? true,
            deleted: true,
          };
      const next = { ...ref.current.overrides, [source.id]: rec };
      commitOverrides(next);
      setTab("check");
      void runCheck({ overrides: next, because: `${source.id} removed from the workspace` });
    },
    [commitOverrides, runCheck],
  );

  const restoreSource = useCallback(
    (id: string) => {
      const next = { ...ref.current.overrides };
      delete next[id];
      commitOverrides(next);
      void runCheck({ overrides: next, because: `${id} restored to its seed version` });
    },
    [commitOverrides, runCheck],
  );

  /** AI unavailable → "Restore seed versions": clears overrides so saved responses can replay. */
  const restoreSeedVersions = useCallback(() => {
    clearOverrides();
    setOverrides({});
    ref.current.overrides = {};
    void runCheck({ overrides: {}, because: "seed versions restored" });
  }, [runCheck]);

  /** Reset workspace: clears overrides AND metrics (SPEC §9). */
  const resetWorkspace = useCallback(() => {
    clearOverrides();
    clearMetrics();
    setOverrides({});
    ref.current.overrides = {};
    setMetrics(emptyMetrics());
    setSourceFocus(null);
    showToast("Workspace reset: seed sources restored and this browser's metrics cleared.");
  }, [showToast]);

  const review = useCallback(
    (checkHash: string, r: Review | null) => updateMetrics((m) => setReview(m, checkHash, r)),
    [updateMetrics],
  );

  const openQuote = useCallback((sourceId: string, quote: string) => {
    setSourceFocus({ sourceId, quote, nonce: Date.now() });
    setTab("sources");
  }, []);

  const decisionLabel = stored ? DECISION_META[stored.result.decision].label : null;

  return {
    role,
    seed,
    seedError,
    tickets,
    ticket,
    draft,
    rail,
    results,
    stored,
    staleReason,
    checking: checking && ticket && checking.ticketId === ticket.id ? checking : null,
    anyChecking: checking !== null,
    sendState,
    ack,
    tab,
    panelOpen,
    mobileView,
    sourceFocus,
    toast,
    pausedDismissed,
    lastAi,
    metrics,
    overrides,
    effectiveSources,
    deletedSources,
    editedCount,
    sent: ticket ? (sent[ticket.id] ?? []) : [],
    decisionLabel,
    railOf,
    isStale,
    actions: {
      loadSeed: () => loadSeed(ref.current.role),
      selectTicket,
      setDraft,
      setRail,
      setAck,
      runCheck: () => runCheck(),
      send,
      applySafeReply,
      switchRole,
      saveSource,
      deleteSource,
      restoreSource,
      restoreSeedVersions,
      resetWorkspace,
      review,
      openQuote,
      setTab,
      setPanelOpen,
      setMobileView,
      dismissToast: () => setToast(null),
      dismissPaused: () => setPausedDismissed(true),
      clearSourceFocus: () => setSourceFocus(null),
    },
  };
}

export type AnswerGuard = ReturnType<typeof useAnswerGuard>;
