import React, { useState, useEffect, useCallback, useRef } from 'react';
import GraphCanvas from './GraphCanvas';
import Toolbar from './Toolbar';
import PropertiesPanel from './PropertiesPanel';
import ConfirmModal from './ConfirmModal';
import ErrorBoundary from './ErrorBoundary';
import { graphApi, debouncedUpdateNodePosition } from '../api/apiClient';
import type {
  GraphData,
  GraphNode,
  GraphEdge,
  ForceGraphData,
  ForceGraphNode,
  ForceGraphEdge,
  SelectedItem,
  UpdateNodeRequest,
  UpdateEdgeRequest
} from '../types/graph';

const GraphView: React.FC = () => {
  // State management
  const [graphData, setGraphData] = useState<ForceGraphData>({ nodes: [], links: [] });
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHighlights, setSearchHighlights] = useState<string[]>([]);
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Ref to track if initial data has been loaded to prevent double loading in StrictMode
  const hasLoadedInitialData = useRef(false);

  // Convert backend data to force graph format
  const convertToForceGraphData = useCallback((data: GraphData): ForceGraphData => {
    const nodeMap = new Map<string, ForceGraphNode>();
    
    // Convert nodes
    const nodes: ForceGraphNode[] = data.nodes.map(node => {
      const forceNode: ForceGraphNode = {
        ...node,
        id: node._id || node.id
      };
      nodeMap.set(forceNode.id, forceNode);
      return forceNode;
    });
    
    // Convert edges to links with node references
    const links: ForceGraphEdge[] = data.edges
      .map(edge => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        
        if (!sourceNode || !targetNode) {
          console.warn(`Edge references non-existent node: ${edge.source} -> ${edge.target}`);
          return null;
        }
        
        return {
          ...edge,
          id: edge._id || edge.id,
          source: sourceNode,
          target: targetNode
        };
      })
      .filter((link): link is ForceGraphEdge => link !== null);
    
    return { nodes, links };
  }, []);

  // Load initial graph data
  const loadGraphData = useCallback(async () => {
    // Prevent double loading in React StrictMode
    if (hasLoadedInitialData.current) {
      return;
    }
    
    try {
      hasLoadedInitialData.current = true;
      setIsLoading(true);
      setError(null);
      const data = await graphApi.getGraph();
      const forceGraphData = convertToForceGraphData(data);
      setGraphData(forceGraphData);
    } catch (err) {
      console.error('Failed to load graph:', err);
      setError(err instanceof Error ? err.message : 'Failed to load graph data');
      // Reset the flag on error so user can retry
      hasLoadedInitialData.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [convertToForceGraphData]);

  // Load data on mount
  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Search functionality
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchHighlights([]);
      return;
    }
    
    try {
      const results = await graphApi.searchNodes(query);
      
      // Sort results to prioritize exact matches first
      const sortedResults = results.sort((a, b) => {
        const aLabel = a.label.toLowerCase();
        const bLabel = b.label.toLowerCase();
        const queryLower = query.toLowerCase();
        
        // Exact match first
        if (aLabel === queryLower && bLabel !== queryLower) return -1;
        if (bLabel === queryLower && aLabel !== queryLower) return 1;
        
        // Starts with query second
        if (aLabel.startsWith(queryLower) && !bLabel.startsWith(queryLower)) return -1;
        if (bLabel.startsWith(queryLower) && !aLabel.startsWith(queryLower)) return 1;
        
        // Alphabetical order for the rest
        return aLabel.localeCompare(bLabel);
      });
      
      const highlightIds = sortedResults.map(node => node._id || node.id);
      setSearchHighlights(highlightIds);
      
      // Auto-center on the first matching node (which is now the best match)
      if (sortedResults.length > 0 && centerOnNodeRef.current) {
        const bestMatch = sortedResults[0];
        const nodeId = bestMatch._id || bestMatch.id;
        
        // Small delay to ensure the highlighting is applied first
        setTimeout(() => {
          centerOnNodeRef.current?.(nodeId);
        }, 100);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setSearchHighlights([]);
    }
  }, []);

  // Node operations
  const handleCreateNode = useCallback(async (event: { x: number; y: number }) => {
    console.log('🎯 Background clicked at coordinates:', event.x, event.y);
    try {
      const newNode = await graphApi.createNode({
        label: `Node ${graphData.nodes.length + 1}`,
        type: 'default',
        properties: {},
        x: event.x,
        y: event.y
      });
      
      const forceNode: ForceGraphNode = {
        ...newNode,
        id: newNode._id || newNode.id
      };
      
      setGraphData(prev => ({
        ...prev,
        nodes: [...prev.nodes, forceNode]
      }));
      
      // Auto-select new node
      setSelectedItem({ type: 'node', item: newNode });
      setIsPropertiesPanelOpen(true);
    } catch (err) {
      console.error('Failed to create node:', err);
      setError('Failed to create node');
    }
  }, [graphData.nodes.length]);

  const handleNodeClick = useCallback((node: ForceGraphNode) => {
    setSelectedItem({ type: 'node', item: node });
    setIsPropertiesPanelOpen(true);
  }, []);

  const handleNodeDrag = useCallback((node: ForceGraphNode) => {
    // Update local position immediately for smooth UI
    setGraphData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => 
        n.id === node.id ? { ...n, x: node.x, y: node.y, fx: node.fx, fy: node.fy } : n
      )
    }));
  }, []);

  const handleNodeDragEnd = useCallback((node: ForceGraphNode) => {
    // Debounced API call to save position
    debouncedUpdateNodePosition(node.id, node.x, node.y);
  }, []);

  // Edge operations
  const handleCreateEdge = useCallback(async (sourceId: string, targetId: string) => {
    try {
      const newEdge = await graphApi.createEdge({
        source: sourceId,
        target: targetId,
        label: 'connects',
        properties: {},
        directed: true
      });
      
      const sourceNode = graphData.nodes.find(n => n.id === sourceId);
      const targetNode = graphData.nodes.find(n => n.id === targetId);
      
      if (!sourceNode || !targetNode) {
        throw new Error('Source or target node not found');
      }
      
      const forceEdge: ForceGraphEdge = {
        ...newEdge,
        id: newEdge._id || newEdge.id,
        source: sourceNode,
        target: targetNode
      };
      
      setGraphData(prev => ({
        ...prev,
        links: [...prev.links, forceEdge]
      }));
      
      // Auto-select new edge (convert back to basic edge for UI)
      const basicEdge: GraphEdge = {
        id: newEdge._id || newEdge.id,
        _id: newEdge._id,
        source: sourceId,
        target: targetId,
        label: newEdge.label,
        properties: newEdge.properties,
        directed: newEdge.directed,
        createdAt: newEdge.createdAt,
        updatedAt: newEdge.updatedAt
      };
      setSelectedItem({ type: 'edge', item: basicEdge });
      setIsPropertiesPanelOpen(true);
      
      // Auto-center on the source node of the newly created edge for better UX
      if (centerOnNodeRef.current) {
        setTimeout(() => {
          centerOnNodeRef.current?.(sourceId);
        }, 200);
      }
    } catch (err) {
      console.error('Failed to create edge:', err);
      setError('Failed to create edge');
    }
  }, [graphData.nodes]);

  const handleEdgeClick = useCallback((edge: ForceGraphEdge) => {
    // Convert ForceGraphEdge back to basic GraphEdge for the UI
    const basicEdge: GraphEdge = {
      id: edge.id,
      _id: edge._id,
      source: typeof edge.source === 'object' ? edge.source.id : edge.source,
      target: typeof edge.target === 'object' ? edge.target.id : edge.target,
      label: edge.label,
      properties: edge.properties,
      directed: edge.directed,
      createdAt: edge.createdAt,
      updatedAt: edge.updatedAt
    };
    setSelectedItem({ type: 'edge', item: basicEdge });
    setIsPropertiesPanelOpen(true);
  }, []);

  // Update operations
  const handleUpdateItem = useCallback(async (updates: UpdateNodeRequest | UpdateEdgeRequest) => {
    if (!selectedItem) return;
    
    try {
      if (selectedItem.type === 'node') {
        const updatedNode = await graphApi.updateNode(selectedItem.item.id, updates as UpdateNodeRequest);
        const updatedId = (updatedNode as any)._id || (updatedNode as any).id;
        
        setGraphData(prev => ({
          ...prev,
          nodes: prev.nodes.map(node => 
            node.id === updatedId ? { ...node, ...updatedNode } : node
          )
        }));
        
        // Preserve normalized id in selection
        setSelectedItem({ type: 'node', item: { ...selectedItem.item, ...updatedNode } });
      } else {
        const updatedEdge = await graphApi.updateEdge(selectedItem.item.id, updates as UpdateEdgeRequest);
        
        // Find and update the edge while maintaining ForceGraph structure
        setGraphData(prev => ({
          ...prev,
          links: prev.links.map(link => {
            if (link.id === updatedEdge.id) {
              return {
                ...link,
                label: updatedEdge.label,
                properties: updatedEdge.properties,
                directed: updatedEdge.directed,
                updatedAt: updatedEdge.updatedAt
              };
            }
            return link;
          })
        }));
        
        setSelectedItem({ type: 'edge', item: updatedEdge });
      }
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('Failed to update item');
    }
  }, [selectedItem]);

  // Delete operations
  const handleDeleteItem = useCallback(() => {
    if (!selectedItem) return;
    
    const isNode = selectedItem.type === 'node';
    const itemName = isNode ? 'node' : 'edge';
    const itemLabel = selectedItem.item.label || 'Unnamed';
    
    setConfirmModal({
      isOpen: true,
      title: `Delete ${itemName}`,
      message: `Are you sure you want to delete the ${itemName} "${itemLabel}"?${
        isNode ? ' This will also delete all connected edges.' : ''
      }`,
      onConfirm: async () => {
        try {
          if (isNode) {
            await graphApi.deleteNode(selectedItem.item.id);
            setGraphData(prev => ({
              nodes: prev.nodes.filter(node => node.id !== selectedItem.item.id),
              links: prev.links.filter(link => 
                link.source.id !== selectedItem.item.id && link.target.id !== selectedItem.item.id
              )
            }));
          } else {
            await graphApi.deleteEdge(selectedItem.item.id);
            setGraphData(prev => ({
              ...prev,
              links: prev.links.filter(link => link.id !== selectedItem.item.id)
            }));
          }
          
          setSelectedItem(null);
          setIsPropertiesPanelOpen(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error(`Failed to delete ${itemName}:`, err);
          setError(`Failed to delete ${itemName}`);
        }
      }
    });
  }, [selectedItem]);

  // Handle edge deletion from context menu (direct deletion without confirmation)
  const handleDeleteEdgeFromContext = useCallback(async (edgeId: string) => {
    try {
      await graphApi.deleteEdge(edgeId);
      setGraphData(prev => ({
        ...prev,
        links: prev.links.filter(link => link.id !== edgeId)
      }));
      
      // If the deleted edge was selected, clear selection
      if (selectedItem?.type === 'edge' && selectedItem.item.id === edgeId) {
        setSelectedItem(null);
        setIsPropertiesPanelOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete edge:', err);
      setError('Failed to delete edge');
    }
  }, [selectedItem]);

  // UI controls
  const fitToScreenRef = useRef<(() => void) | null>(null);
  const centerOnNodeRef = useRef<((nodeId: string) => void) | null>(null);
  
  const handleFitToScreen = useCallback(() => {
    if (fitToScreenRef.current) {
      fitToScreenRef.current();
    }
  }, []);



  const handleClosePropertiesPanel = useCallback(() => {
    setIsPropertiesPanelOpen(false);
    setSelectedItem(null);
  }, []);

  const handleCloseConfirmModal = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Error auto-clear
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className="relative w-full h-full">
      {/* Error banner */}
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 z-30 animate-fade-in">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-40">
          <div className="text-center">
            <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
            <p className="text-white">Loading graph data...</p>
          </div>
        </div>
      )}
      
      {/* Toolbar */}
      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        onFitToScreen={handleFitToScreen}
      />
      
      {/* Graph canvas */}
      <ErrorBoundary>
        <GraphCanvas
          data={graphData}
          selectedItem={selectedItem}
          searchHighlights={searchHighlights}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onBackgroundClick={handleCreateNode}
          onNodeDrag={handleNodeDrag}
          onNodeDragEnd={handleNodeDragEnd}
          onCreateEdge={handleCreateEdge}
          onDeleteEdge={handleDeleteEdgeFromContext}
          onFitToScreen={fitToScreenRef}
          onCenterOnNode={centerOnNodeRef}
        />
      </ErrorBoundary>
      
      {/* Properties panel */}
      <PropertiesPanel
        selectedItem={selectedItem}
        isOpen={isPropertiesPanelOpen}
        onClose={handleClosePropertiesPanel}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
      />
      
      {/* Confirm modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={handleCloseConfirmModal}
      />
    </div>
  );
};

export default GraphView; 