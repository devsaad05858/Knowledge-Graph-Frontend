// Core graph data types
export interface GraphNode {
  id: string;
  _id?: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  x: number;
  y: number;
  fx?: number;
  fy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GraphEdge {
  id: string;
  _id?: string;
  source: string;
  target: string;
  label: string;
  properties: Record<string, any>;
  directed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Force graph specific types
export interface ForceGraphNode extends GraphNode {
  vx?: number;
  vy?: number;
  index?: number;
}

export interface ForceGraphEdge extends Omit<GraphEdge, 'source' | 'target'> {
  source: ForceGraphNode;
  target: ForceGraphNode;
}

export interface ForceGraphData {
  nodes: ForceGraphNode[];
  links: ForceGraphEdge[];
}

// UI state types
export interface SelectedItem {
  type: 'node' | 'edge';
  item: GraphNode | GraphEdge;
}

export interface DragState {
  isDragging: boolean;
  sourceNode: ForceGraphNode | null;
  currentPosition: { x: number; y: number } | null;
}

export interface SearchState {
  query: string;
  results: GraphNode[];
  highlightedNodes: string[];
}

// API types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateNodeRequest {
  label: string;
  type?: string;
  properties?: Record<string, any>;
  x: number;
  y: number;
}

export interface UpdateNodeRequest {
  label?: string;
  type?: string;
  properties?: Record<string, any>;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

export interface CreateEdgeRequest {
  source: string;
  target: string;
  label?: string;
  properties?: Record<string, any>;
  directed?: boolean;
}

export interface UpdateEdgeRequest {
  label?: string;
  properties?: Record<string, any>;
  directed?: boolean;
}

// Component props types
export interface GraphViewProps {
  className?: string;
}

export interface GraphCanvasProps {
  data: ForceGraphData;
  selectedItem: SelectedItem | null;
  searchHighlights: string[];
  onNodeClick: (node: ForceGraphNode) => void;
  onEdgeClick: (edge: ForceGraphEdge) => void;
  onBackgroundClick: (event: { x: number; y: number }) => void;
  onNodeDrag: (node: ForceGraphNode) => void;
  onNodeDragEnd: (node: ForceGraphNode) => void;
  onCreateEdge: (source: string, target: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onFitToScreen: (() => void) | React.MutableRefObject<(() => void) | null>;
  onCenterOnNode?: React.MutableRefObject<((nodeId: string) => void) | null>;
  className?: string;
}

export interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFitToScreen: () => void;
  className?: string;
}

export interface PropertiesPanelProps {
  selectedItem: SelectedItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (updates: UpdateNodeRequest | UpdateEdgeRequest) => void;
  onDeleteItem: () => void;
  className?: string;
}

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

 