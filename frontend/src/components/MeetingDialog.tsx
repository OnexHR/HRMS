import type { ReactNode } from "react";

type MeetingDialogProps = {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  onCreated?: () => void | Promise<void>;
  scope?: "employee" | "manager";
};

export default function MeetingDialog({
  open,
  onClose,
  children,
}: MeetingDialogProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl">
        {children}
      </div>
    </div>
  );
}
