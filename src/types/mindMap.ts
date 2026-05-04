import type { LucideIcon } from 'lucide-react';

export type NodeSize = 'large' | 'medium' | 'small';

export interface MindMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  size: NodeSize;
  connections: string[];
  icon: LucideIcon;
  /** Stronger visual weight (ring / stroke); defaults inferred from size if omitted */
  emphasis?: boolean;
}
