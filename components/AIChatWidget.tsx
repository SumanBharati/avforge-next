"use client";

import { useState, useCallback } from "react";
import { BotIcon } from "./Icons";
import AIAssistant from "./AIAssistant";

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const handleAlertCount = useCallback((count: number) => {
    setAlertCount(count);
  }, []);

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-20 right-3 z-[1000] flex h-[min(520px,calc(100dvh-120px))] w-[calc(100vw-24px)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-forge-bg shadow-2xl shadow-[var(--shadow-color)] sm:right-6">
          {/* Panel Header */}
          <div className="flex items-center justify-between border-b border-border bg-forge-panel px-[18px] py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
                <BotIcon />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-body">
                  AI Assistant
                </div>
                <div className="text-[10px] text-subtle">
                  AV system design expert
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-lg leading-none text-subtle transition-colors hover:text-secondary"
            >
              ✕
            </button>
          </div>

          {/* Chat Body */}
          <div className="min-h-0 flex-1">
            <AIAssistant onAlertCount={handleAlertCount} />
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-5 right-2 z-[1001] flex h-[44px] w-[44px] items-center justify-center rounded-2xl border-none shadow-lg shadow-[var(--shadow-color)] transition-all hover:scale-[1.08] ${
          open ? "bg-forge-surface" : "bg-blue-600"
        }`}
      >
        {open ? (
          <span className="text-xl text-muted">✕</span>
        ) : (
          <>
            <BotIcon />
            {alertCount > 0 && !open && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
}
