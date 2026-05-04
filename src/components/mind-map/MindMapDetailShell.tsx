import type { ReactNode } from 'react';

interface MindMapDetailShellProps {
  open: boolean;
  title: string;
  onDismiss: () => void;
  children: ReactNode;
  /** DAO hero uses a pinned side panel on desktop instead of the default bottom sheet */
  layout?: 'sheet' | 'dao-side';
}

export default function MindMapDetailShell({
  open,
  title,
  onDismiss,
  children,
  layout = 'sheet',
}: MindMapDetailShellProps) {
  if (!open) return null;

  if (layout === 'dao-side') {
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/25 md:hidden motion-reduce:transition-none"
          aria-label="Dismiss details"
          onClick={onDismiss}
        />
        <div
          className="fixed bottom-0 left-0 right-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border-2 border-black bg-white p-4 pb-6 shadow-xl motion-safe:animate-slide-up md:absolute md:inset-auto md:bottom-auto md:left-auto md:right-8 md:top-1/2 md:z-30 md:max-h-none md:max-w-sm md:-translate-y-1/2 md:overflow-visible md:rounded-none md:p-6 md:shadow-xl"
          role="region"
          aria-label={`Details for ${title}`}
        >
          <div className="mb-3 flex items-start justify-between gap-3 md:hidden">
            <h3 className="font-serif text-lg font-bold">{title}</h3>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-full border border-black px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-black hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="hidden md:block">
            <h3 className="mb-4 font-serif text-xl font-bold">{title}</h3>
          </div>
          <div className="space-y-3">{children}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-30 bg-black/25 md:hidden"
        aria-label="Dismiss details"
        onClick={onDismiss}
      />
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 md:static md:z-auto md:px-4 md:pb-8">
        <div
          className="motion-safe:animate-slide-up mx-auto max-h-[80vh] max-w-4xl overflow-y-auto rounded-t-2xl border-2 border-b-0 border-black bg-white p-4 shadow-xl md:max-h-none md:rounded-none md:border-b-2 md:p-6"
          role="region"
          aria-label={`Details for ${title}`}
        >
          <div className="mb-3 flex items-start justify-between gap-3 md:hidden">
            <h3 className="font-serif text-lg font-bold">{title}</h3>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-full border border-black px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-black hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="hidden md:block">
            <h3 className="mb-4 font-serif text-xl font-bold">{title}</h3>
          </div>
          <div className="space-y-3">{children}</div>
        </div>
      </div>
    </>
  );
}
