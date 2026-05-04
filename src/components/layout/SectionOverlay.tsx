import type { ReactNode } from 'react';

interface SectionOverlayProps {
  open: boolean;
  isReturning: boolean;
  children: ReactNode;
}

export default function SectionOverlay({
  open,
  isReturning,
  children,
}: SectionOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-white">
      <div
        className={`absolute inset-0 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain transition-all duration-1000 ${
          isReturning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
