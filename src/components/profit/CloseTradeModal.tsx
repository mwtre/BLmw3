import { useId, useRef } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface CloseTradeModalProps {
  open: boolean;
  symbol?: string;
  exitValue: string;
  onExitChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CloseTradeModal({
  open,
  symbol,
  exitValue,
  onExitChange,
  onConfirm,
  onCancel,
}: CloseTradeModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useModalA11y(open, panelRef, onCancel);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 md:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md rounded-2xl border-2 border-black bg-white p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id={titleId} className="font-serif text-xl font-bold">
          Close trade{symbol ? ` · ${symbol}` : ''}
        </h4>
        <p id={descId} className="mt-2 text-sm text-gray-600">
          Exit price (USD). Use live quote or type fill.
        </p>
        <label htmlFor="exit-price-input" className="sr-only">
          Exit price in USD
        </label>
        <input
          id="exit-price-input"
          value={exitValue}
          onChange={(e) => onExitChange(e.target.value)}
          className="mt-4 w-full rounded border-2 border-black px-3 py-2"
          inputMode="decimal"
          placeholder="Exit price"
          autoComplete="off"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-full bg-black py-2 font-bold uppercase tracking-wide text-white"
          >
            Save closed
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border-2 border-black py-2 font-bold uppercase tracking-wide"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
