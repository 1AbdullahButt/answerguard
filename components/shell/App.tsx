"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useAnswerGuard } from "@/lib/client/useAnswerGuard";
import { cx, ui } from "@/components/ui/atoms";
import { TicketList } from "@/components/inbox/TicketList";
import { Thread } from "@/components/inbox/Thread";
import { Composer } from "@/components/inbox/Composer";
import { SidePanel, DISCLAIMER } from "@/components/panel/SidePanel";
import { CheckTab } from "@/components/panel/CheckTab";
import { ReasoningTab } from "@/components/panel/ReasoningTab";
import { SourcesTab } from "@/components/panel/SourcesTab";
import { ImpactTab } from "@/components/panel/ImpactTab";
import { TopBar } from "./TopBar";
import inbox from "@/components/inbox/inbox.module.css";
import s from "./shell.module.css";

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function ResetDialog({ edited, onCancel, onConfirm }: { edited: number; onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);
  return (
    <div
      className={s.dialogScrim}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-title"
        aria-describedby="reset-desc"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Tab") {
            const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("button"));
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <h2 id="reset-title">Reset workspace?</h2>
        <p id="reset-desc">
          Restores all seed sources ({edited} edited) and clears this browser&apos;s metrics. This can&apos;t be undone.
        </p>
        <div className={s.dialogActions}>
          <button ref={cancelRef} type="button" className={ui.btn} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={cx(ui.btn, s.danger)} onClick={onConfirm}>
            Reset and clear
          </button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const ag = useAnswerGuard();
  const { actions } = ag;
  const overlay = useMediaQuery("(max-width: 1099px)");
  const [confirmReset, setConfirmReset] = useState(false);
  const [sheetFull, setSheetFull] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const dismissRef = useRef(actions.dismissToast);
  dismissRef.current = actions.dismissToast;

  const openPanel = useCallback(() => {
    if (!overlay) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    actions.setPanelOpen(true);
  }, [overlay, actions]);

  const closePanel = useCallback(() => {
    actions.setPanelOpen(false);
    setSheetFull(false);
    triggerRef.current?.focus();
  }, [actions]);

  const onCheck = useCallback(() => {
    actions.setTab("check");
    openPanel();
    void actions.runCheck();
  }, [actions, openPanel]);

  // Toasts dismiss themselves.
  useEffect(() => {
    if (!ag.toast) return;
    const t = window.setTimeout(dismissRef.current, 4000);
    return () => window.clearTimeout(t);
  }, [ag.toast]);

  const ticket = ag.ticket;

  let panelContent = null;
  if (ag.tab === "check") {
    panelContent = (
      <CheckTab
        draft={ag.draft}
        stored={ag.stored}
        staleReason={ag.staleReason}
        checking={ag.checking}
        sources={ag.effectiveSources}
        pausedVisible={!ag.pausedDismissed}
        onDismissPaused={actions.dismissPaused}
        onRecheck={onCheck}
        onWhy={() => actions.setTab("reasoning")}
        onRestoreSeed={actions.restoreSeedVersions}
        onUseSafe={actions.applySafeReply}
      />
    );
  } else if (ag.tab === "reasoning") {
    panelContent = (
      <ReasoningTab
        stored={ag.stored}
        staleReason={ag.staleReason}
        sources={ag.effectiveSources}
        onOpenQuote={actions.openQuote}
        onRecheck={onCheck}
      />
    );
  } else if (ag.tab === "sources") {
    panelContent = (
      <SourcesTab
        role={ag.role}
        sources={ag.effectiveSources}
        deleted={ag.deletedSources}
        overrides={ag.overrides}
        focus={ag.sourceFocus}
        onSave={actions.saveSource}
        onRemove={actions.deleteSource}
        onRestore={actions.restoreSource}
        onClearFocus={actions.clearSourceFocus}
      />
    );
  } else {
    panelContent = <ImpactTab metrics={ag.metrics} onReview={actions.review} />;
  }

  return (
    <div className={s.app}>
      <TopBar role={ag.role} onRole={(r) => void actions.switchRole(r)} onReset={() => setConfirmReset(true)} ai={ag.lastAi} />
      <div className={cx(s.main, ag.mobileView === "list" ? inbox.viewList : inbox.viewThread)}>
        {ag.seedError && !ag.seed ? (
          <div className={s.seedError} role="alert" style={{ gridColumn: "1 / -1" }}>
            <p>Couldn&apos;t load the demo workspace: {ag.seedError}</p>
            <button type="button" className={cx(ui.btn, ui.primary)} onClick={() => void actions.loadSeed()}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <TicketList
              tickets={ag.tickets}
              selectedId={ticket?.id ?? ""}
              rails={ag.railOf}
              results={ag.results}
              isStale={ag.isStale}
              onSelect={actions.selectTicket}
            />
            {ticket ? (
              <Thread ticket={ticket} rail={ag.rail} onRail={actions.setRail} sent={ag.sent} onBack={() => actions.setMobileView("list")}>
                <Composer
                  customer={ticket.customer}
                  draft={ag.draft}
                  onChange={actions.setDraft}
                  onCheck={onCheck}
                  onSend={() => void actions.send()}
                  checking={ag.checking !== null}
                  sendState={ag.sendState}
                  stored={ag.stored}
                  staleReason={ag.staleReason}
                  ack={ag.ack}
                  onAck={actions.setAck}
                  onInsertSafe={actions.applySafeReply}
                  panelOpen={ag.panelOpen}
                  onTogglePanel={() => (ag.panelOpen ? closePanel() : openPanel())}
                />
              </Thread>
            ) : (
              <main className={inbox.thread} aria-label="Conversation" aria-busy="true" />
            )}
            {overlay && ag.panelOpen ? <div className={s.scrimOn} onClick={closePanel} aria-hidden="true" /> : null}
            <SidePanel
              tab={ag.tab}
              onTab={actions.setTab}
              sourceCount={ag.effectiveSources.length}
              overlay={overlay}
              open={ag.panelOpen}
              full={sheetFull}
              onToggleFull={() => setSheetFull((f) => !f)}
              onClose={closePanel}
              onRecheck={onCheck}
              canRecheck={Boolean(ag.draft.trim())}
            >
              {panelContent}
            </SidePanel>
          </>
        )}
      </div>
      <footer className={s.footer}>
        <span>{DISCLAIMER}</span>
      </footer>
      {ag.toast ? (
        <div className={s.toast} role="alert" key={ag.toast.id}>
          <span>{ag.toast.message}</span>
          <button type="button" aria-label="Dismiss" onClick={actions.dismissToast}>
            <X aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {confirmReset ? (
        <ResetDialog
          edited={ag.editedCount}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            actions.resetWorkspace();
          }}
        />
      ) : null}
    </div>
  );
}
