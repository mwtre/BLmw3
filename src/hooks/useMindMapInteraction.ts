import { useCallback, useEffect, useState } from 'react';

export function useMindMapInteraction() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleSelectNode = useCallback((id: string) => {
    setSelectedNode((s) => (s === id ? null : id));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    setHoveredNode(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !selectedNode) return;
      e.preventDefault();
      setSelectedNode(null);
      setHoveredNode(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedNode]);

  return {
    hoveredNode,
    setHoveredNode,
    selectedNode,
    setSelectedNode,
    toggleSelectNode,
    clearSelection,
    expandedCard,
    setExpandedCard,
  };
}
