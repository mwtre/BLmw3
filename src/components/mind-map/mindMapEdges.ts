import type { MindMapNode } from '../../types/mindMap';

export interface UniqueEdge {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** lexicographically smaller endpoint id — used for stable arrow direction */
  fromId: string;
  toId: string;
}

/** One undirected edge per node pair (avoids doubled strokes). */
export function getUniqueEdges(nodes: MindMapNode[]): UniqueEdge[] {
  const seen = new Set<string>();
  const edges: UniqueEdge[] = [];

  for (const node of nodes) {
    for (const connId of node.connections) {
      const other = nodes.find((n) => n.id === connId);
      if (!other) continue;

      const [idLo, idHi] = node.id < connId ? [node.id, connId] : [connId, node.id];
      const key = `${idLo}::${idHi}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const a = nodes.find((n) => n.id === idLo)!;
      const b = nodes.find((n) => n.id === idHi)!;

      edges.push({
        key,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        fromId: idLo,
        toId: idHi,
      });
    }
  }

  return edges;
}

/** Quadratic Bézier with perpendicular offset at midpoint for cleaner routing. */
export function curvedEdgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curve = 4.5
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const cx = mx + (-dy / len) * curve;
  const cy = my + (dx / len) * curve;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export function edgeHighlighted(
  hoveredNode: string | null,
  selectedNode: string | null,
  aId: string,
  bId: string
): { highlighted: boolean; selectedEdge: boolean } {
  const highlighted =
    hoveredNode === aId ||
    hoveredNode === bId ||
    false;
  const selectedEdge =
    selectedNode === aId ||
    selectedNode === bId ||
    false;
  return { highlighted, selectedEdge };
}
