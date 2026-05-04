import { useId, type CSSProperties, type ReactNode } from 'react';
import type { MindMapNode } from '../../types/mindMap';
import { curvedEdgePath, edgeHighlighted, getUniqueEdges } from './mindMapEdges';
import { getSizeClass } from './mindMapSizing';

export type MindMapEdgeStyle = 'default' | 'arrow';

interface MindMapGraphProps {
  nodes: MindMapNode[];
  containerClassName: string;
  hoveredNode: string | null;
  selectedNode: string | null;
  onHoverNode: (id: string | null) => void;
  onToggleSelectNode: (id: string) => void;
  edgeStyle?: MindMapEdgeStyle;
  svgExtraDefs?: ReactNode;
  /** Pattern id defined in svgExtraDefs — tiles the SVG background */
  backgroundPatternId?: string;
  nodeInteractionStyle?: CSSProperties;
}

export default function MindMapGraph({
  nodes,
  containerClassName,
  hoveredNode,
  selectedNode,
  onHoverNode,
  onToggleSelectNode,
  edgeStyle = 'default',
  svgExtraDefs,
  backgroundPatternId,
  nodeInteractionStyle,
}: MindMapGraphProps) {
  const uid = useId().replace(/:/g, '');
  const arrowMarkerId = `${uid}-arrowhead`;
  const edges = getUniqueEdges(nodes);

  return (
    <div className={`relative w-full max-w-6xl mx-auto ${containerClassName}`}>
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ zIndex: 1 }}
        aria-hidden
      >
        <defs>
          {svgExtraDefs}
          {edgeStyle === 'arrow' && (
            <marker
              id={arrowMarkerId}
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="black" opacity="0.35" />
            </marker>
          )}
        </defs>

        {backgroundPatternId && (
          <rect
            x="0"
            y="0"
            width="100"
            height="100"
            fill={`url(#${backgroundPatternId})`}
            opacity={0.14}
          />
        )}

        {edges.map((edge) => {
          const { highlighted, selectedEdge } = edgeHighlighted(
            hoveredNode,
            selectedNode,
            edge.fromId,
            edge.toId
          );
          const d = curvedEdgePath(edge.x1, edge.y1, edge.x2, edge.y2);
          const opacity = highlighted ? 0.72 : selectedEdge ? 0.48 : 0.26;
          const strokeW = highlighted ? 0.65 : 0.42;

          return (
            <path
              key={edge.key}
              d={d}
              fill="none"
              stroke="black"
              strokeWidth={strokeW}
              vectorEffect="non-scaling-stroke"
              pathLength={100}
              opacity={opacity}
              strokeLinecap="round"
              className="motion-safe:animate-draw-edge motion-reduce:[stroke-dashoffset:0]"
              style={{
                strokeDasharray: 100,
              }}
              markerEnd={edgeStyle === 'arrow' ? `url(#${arrowMarkerId})` : undefined}
            />
          );
        })}
      </svg>

      {nodes.map((node, index) => {
        const isSelected = selectedNode === node.id;
        const isHover = hoveredNode === node.id;
        const labelShown = isHover || isSelected;
        const emphasized = node.emphasis ?? node.size === 'large';

        return (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 transform motion-safe:animate-scale-in motion-reduce:animate-none motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              zIndex: 10,
              animationDelay: `${index * 100}ms`,
            }}
          >
            <button
              type="button"
              className="group relative cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none transition-transform duration-500 ease-out focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 motion-reduce:transition-none"
              style={nodeInteractionStyle}
              onPointerEnter={() => onHoverNode(node.id)}
              onPointerLeave={() => onHoverNode(null)}
              onClick={() => onToggleSelectNode(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleSelectNode(node.id);
                }
              }}
              aria-label={node.label}
              aria-pressed={isSelected}
            >
              <div
                className={`relative flex ${getSizeClass(node.size)} items-center justify-center rounded-full border-2 transition-all duration-500 motion-reduce:transition-none ${
                  emphasized && !isSelected
                    ? 'ring-2 ring-black/10 ring-offset-2 ring-offset-white'
                    : ''
                } ${
                  isSelected
                    ? 'scale-110 border-black bg-black text-white shadow-2xl'
                    : isHover
                      ? 'border-black bg-black text-white shadow-xl'
                      : 'border-black bg-white hover:scale-110 hover:bg-black hover:text-white hover:shadow-xl'
                }`}
              >
                <node.icon className="transition-colors" />

                {node.size === 'large' && (
                  <span
                    className={`pointer-events-none absolute inset-0 rounded-full border-2 border-black motion-reduce:animate-none ${
                      isHover || isSelected
                        ? 'animate-ping opacity-30 motion-reduce:opacity-0'
                        : 'opacity-0'
                    }`}
                    aria-hidden
                  />
                )}
              </div>

              <div
                className={`pointer-events-none absolute -bottom-8 left-1/2 max-w-[min(42vw,12rem)] -translate-x-1/2 transform text-center text-[10px] font-semibold uppercase tracking-wider transition-opacity duration-300 motion-reduce:transition-none sm:text-xs ${
                  labelShown
                    ? 'opacity-100'
                    : 'max-sm:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100'
                }`}
              >
                <span className="line-clamp-2">{node.label}</span>
              </div>

              {isSelected && (
                <span
                  className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-black"
                  aria-hidden
                />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
