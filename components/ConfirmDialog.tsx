"use client";

interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, confirmLabel = "Delete", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-forge-panel shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5">
          <h3 className="text-[16px] font-bold text-heading">{title}</h3>
          <p className="mt-1.5 text-[13px] text-body">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-3">
          <button onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-[12px] text-subtle hover:text-body">Cancel</button>
          <button onClick={onConfirm} className="rounded-lg bg-red-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-red-600">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
