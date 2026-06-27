import { ChevronDown } from 'lucide-react';

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
}

export default function ScrollToBottom({ visible, onClick }: ScrollToBottomProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onClick}
      className="scroll-fab"
      title="Scroll to latest"
    >
      <ChevronDown className="w-4 h-4" />
    </button>
  );
}
