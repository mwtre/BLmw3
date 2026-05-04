import { X } from 'lucide-react';

type CloseVariant = 'fixed' | 'absolute';

interface MindMapCloseButtonProps {
  onClose: () => void;
  variant?: CloseVariant;
}

export default function MindMapCloseButton({
  onClose,
  variant = 'fixed',
}: MindMapCloseButtonProps) {
  if (variant === 'absolute') {
    return (
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 md:top-8 right-4 md:right-8 z-50 p-2 md:p-3 rounded-full bg-white border-2 border-black hover:bg-black hover:text-white transition-colors"
        aria-label="Close section"
      >
        <X className="w-6 h-6" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClose}
      className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white border-2 border-black hover:bg-black hover:text-white transition-colors shadow-lg"
      aria-label="Close section"
    >
      <X className="w-5 h-5" />
    </button>
  );
}
