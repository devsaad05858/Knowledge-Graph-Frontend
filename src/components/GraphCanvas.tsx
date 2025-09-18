import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { NODE_TYPE_COLORS, PHYSICS_CONFIG } from '../types/constants';
import type {
  ForceGraphData,
  ForceGraphNode,
  ForceGraphEdge,
  SelectedItem,
  GraphCanvasProps,
  DragState
} from '../types/graph';

const GraphCanvas: React.FC<GraphCanvasProps> = ({
  data,
  selectedItem,
  searchHighlights,
  onNodeClick,
  onEdgeClick,
  onBackgroundClick,
  onNodeDrag,
  onNodeDragEnd,
  onCreateEdge,
  onDeleteEdge,
  onFitToScreen,
  onCenterOnNode,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const containerRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    sourceNode: ForceGraphNode | null;
    targetNode: ForceGraphNode | null;
  }>({ show: false, x: 0, y: 0, sourceNode: null, targetNode: null });

  // Keep latest onBackgroundClick to avoid stale handler in D3 event
  useEffect(() => {
    onBackgroundClickRef.current = onBackgroundClick;
  }, [onBackgroundClick]);

  // Helper function to get connected nodes and their edge IDs
  const getConnectedNodesInfo = useCallback((sourceNodeId: string) => {
    const connectedInfo: { node: ForceGraphNode; edgeId: string; isSource: boolean }[] = [];
    
    data.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === sourceNodeId) {
        const targetNode = data.nodes.find(n => n.id === targetId);
        if (targetNode) {
          connectedInfo.push({ node: targetNode, edgeId: link.id, isSource: true });
        }
      } else if (targetId === sourceNodeId) {
        const sourceNode = data.nodes.find(n => n.id === sourceId);
        if (sourceNode) {
          connectedInfo.push({ node: sourceNode, edgeId: link.id, isSource: false });
        }
      }
    });
    
    return connectedInfo;
  }, [data.links, data.nodes]);

  // Helper function to get unconnected nodes
  const getUnconnectedNodes = useCallback((sourceNodeId: string) => {
    const connectedNodeIds = new Set();
    
    data.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === sourceNodeId) {
        connectedNodeIds.add(targetId);
      } else if (targetId === sourceNodeId) {
        connectedNodeIds.add(sourceId);
      }
    });
    
    return data.nodes.filter(node => 
      node.id !== sourceNodeId && !connectedNodeIds.has(node.id)
    );
  }, [data.links, data.nodes]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(prev => ({ ...prev, show: false }));
    };

    if (contextMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.show]);

  // Initialize SVG and zoom behavior (only once)
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Add arrow marker definitions for directed edges
    const defs = svg.append("defs");
    
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#6b7280")
      .style("stroke", "none");

    // Add selected arrow marker (different color)
    defs.append("marker")
      .attr("id", "arrowhead-selected")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "#ffffff")
      .style("stroke", "none");

    // Create main container
    const container = svg.append("g");
    containerRef.current = container;

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        currentTransformRef.current = event.transform;
        container.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Handle background click
    svg.on("click", (event) => {
      if (event.target === event.currentTarget) {
        const [x, y] = d3.pointer(event, container.node());
        onBackgroundClickRef.current?.({ x, y });
      }
    });

    // Initialize simulation (will be configured in data update effect)
    const simulation = d3.forceSimulation()
      .alphaDecay(PHYSICS_CONFIG.ALPHA_DECAY)
      .velocityDecay(PHYSICS_CONFIG.VELOCITY_DECAY)
      .alphaTarget(PHYSICS_CONFIG.ALPHA_TARGET);
    
    simulationRef.current = simulation;

    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  }, [dimensions.width, dimensions.height]);

  // Update graph data and maintain smooth transitions
  useEffect(() => {
    if (!containerRef.current || !simulationRef.current) return;

    const container = containerRef.current;
    const simulation = simulationRef.current;

    // Handle empty data case
    if (data.nodes.length === 0) {
      container.selectAll(".links, .nodes, .node-labels, .link-labels").remove();
      
      // Store empty functions in parent's refs when no data
      const emptyFitFunction = () => {
        if (zoomRef.current && svgRef.current) {
          d3.select(svgRef.current).transition().duration(750).call(
            zoomRef.current.transform as any,
            d3.zoomIdentity.translate(dimensions.width / 2, dimensions.height / 2).scale(1)
          );
        }
      };
      const emptyCenterFunction = () => {
        // No-op when no nodes
      };
      
      if (typeof onFitToScreen === 'object' && onFitToScreen !== null && 'current' in onFitToScreen) {
        (onFitToScreen as any).current = emptyFitFunction;
      }
      if (typeof onCenterOnNode === 'object' && onCenterOnNode !== null && 'current' in onCenterOnNode) {
        (onCenterOnNode as any).current = emptyCenterFunction;
      }
      return;
    }

    // Configure simulation forces
    simulation
      .force("link", d3.forceLink(data.links as any)
        .id((d: any) => d.id)
        .distance(PHYSICS_CONFIG.LINK_DISTANCE)
        .strength(0.6))
      .force("charge", d3.forceManyBody()
        .strength(PHYSICS_CONFIG.CHARGE_STRENGTH)
        .distanceMax(300))
      .force("center", d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collision", d3.forceCollide()
        .radius(PHYSICS_CONFIG.COLLISION_RADIUS)
        .strength(0.8));

    // Update simulation nodes with smooth transition
    const existingNodes = simulation.nodes();
    const newNodes = [...data.nodes] as any[];
    
    // Preserve positions and fixed states for existing nodes
    newNodes.forEach((newNode: any) => {
      const existingNode = existingNodes.find((n: any) => n.id === newNode.id);
      if (existingNode) {
        newNode.x = existingNode.x;
        newNode.y = existingNode.y;
        newNode.vx = existingNode.vx || 0;
        newNode.vy = existingNode.vy || 0;
        newNode.fx = existingNode.fx;
        newNode.fy = existingNode.fy;
      }
    });

    simulation.nodes(newNodes);
    
    // Gently reheat simulation for smooth transitions
    if (simulation.alpha() < PHYSICS_CONFIG.ALPHA_TARGET) {
      simulation.alpha(PHYSICS_CONFIG.REHEAT_STRENGTH).restart();
    }

    // Create/update links with smooth transitions
    const linkSelection = container.selectAll(".links")
      .data([0]);
    
    const linkContainer = linkSelection.enter()
      .append("g")
      .attr("class", "links")
      .merge(linkSelection as any);

    const link = linkContainer.selectAll("line")
      .data(data.links, (d: any) => d.id);

    // Remove old links with fade out
    link.exit()
      .transition()
      .duration(300)
      .attr("stroke-opacity", 0)
      .remove();

    // Add new links with fade in
    const linkEnter = link.enter()
      .append("line")
      .attr("stroke", "#6b7280")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0)
      .attr("marker-end", (d: any) => d.directed ? "url(#arrowhead)" : null)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onEdgeClick(d as ForceGraphEdge);
      });

    const linkMerged = linkEnter.merge(link as any)
      .transition()
      .duration(300)
      .attr("stroke-opacity", 1);

    // Create/update link labels
    const linkLabelSelection = container.selectAll(".link-labels")
      .data([0]);
    
    const linkLabelContainer = linkLabelSelection.enter()
      .append("g")
      .attr("class", "link-labels")
      .merge(linkLabelSelection as any);

    const linkLabel = linkLabelContainer.selectAll("text")
      .data(data.links, (d: any) => d.id);

    linkLabel.exit()
      .transition()
      .duration(300)
      .attr("opacity", 0)
      .remove();

    const linkLabelEnter = linkLabel.enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#ffffff")
      .attr("opacity", 0)
      .text((d: any) => d.label);

    const linkLabelMerged = linkLabelEnter.merge(linkLabel as any)
      .text((d: any) => d.label)
      .transition()
      .duration(300)
      .attr("opacity", 1);

    // Create/update nodes with smooth transitions
    const nodeSelection = container.selectAll(".nodes")
      .data([0]);
    
    const nodeContainer = nodeSelection.enter()
      .append("g")
      .attr("class", "nodes")
      .merge(nodeSelection as any);

    const node = nodeContainer.selectAll("circle")
      .data(data.nodes, (d: any) => d.id);

    // Remove old nodes with scale out
    node.exit()
      .transition()
      .duration(300)
      .attr("r", 0)
      .remove();

    // Add new nodes with scale in
    const nodeEnter = node.enter()
      .append("circle")
      .attr("r", 0)
      .attr("data-node-id", (d: any) => d.id)
      .attr("fill", (d: any) => NODE_TYPE_COLORS[d.type] || NODE_TYPE_COLORS.default)
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick(d as ForceGraphNode);
        // Trigger center on node after a short delay to ensure positioning
        setTimeout(() => {
          if (typeof onCenterOnNode === 'object' && onCenterOnNode?.current) {
            onCenterOnNode.current(d.id);
          }
        }, 100);
      })
      .on("contextmenu", (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        const [x, y] = d3.pointer(event, document.body);
        setContextMenu({
          show: true,
          x,
          y,
          sourceNode: d as ForceGraphNode,
          targetNode: null
        });
      })
      .call(d3.drag<any, any>()
        .on("start", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          // Fix node position during drag
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
          onNodeDrag(d);
        })
        .on("end", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(PHYSICS_CONFIG.ALPHA_TARGET);
          
          // Keep position fixed after drag for stable positioning
          // This prevents unwanted movement after manual positioning
          d.fx = d.x;
          d.fy = d.y;
          
          onNodeDragEnd(d);
        })
      );

    const nodeMerged = nodeEnter.merge(node as any)
      .transition()
      .duration(300)
      .attr("r", 8)
      .attr("fill", (d: any) => NODE_TYPE_COLORS[d.type] || NODE_TYPE_COLORS.default);

    // Create/update node labels
    const nodeLabelSelection = container.selectAll(".node-labels")
      .data([0]);
    
    const nodeLabelContainer = nodeLabelSelection.enter()
      .append("g")
      .attr("class", "node-labels")
      .merge(nodeLabelSelection as any);

    const nodeLabel = nodeLabelContainer.selectAll("text")
      .data(data.nodes, (d: any) => d.id);

    nodeLabel.exit()
      .transition()
      .duration(300)
      .attr("opacity", 0)
      .remove();

    const nodeLabelEnter = nodeLabel.enter()
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 25)
      .attr("font-size", "12px")
      .attr("fill", "#ffffff")
      .attr("opacity", 0)
      .style("pointer-events", "none")
      .text((d: any) => d.label);

    const nodeLabelMerged = nodeLabelEnter.merge(nodeLabel as any)
      .text((d: any) => d.label)
      .transition()
      .duration(300)
      .attr("opacity", 1);

    // Update positions on simulation tick with smooth edge updates
    simulation.on("tick", () => {
      // Update links
      container.selectAll(".links line")
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      // Update link labels
      container.selectAll(".link-labels text")
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      // Update nodes
      container.selectAll(".nodes circle")
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      // Update node labels
      container.selectAll(".node-labels text")
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    // Fit to screen function that preserves current zoom/pan
    const fitToScreen = () => {
      if (!svgRef.current || !zoomRef.current) return;
      
      const bounds = container.node()?.getBBox();
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        const fullWidth = dimensions.width;
        const fullHeight = dimensions.height;
        const widthScale = fullWidth / bounds.width;
        const heightScale = fullHeight / bounds.height;
        const scale = Math.min(widthScale, heightScale) * 0.8;

        const translate = [
          fullWidth / 2 - scale * (bounds.x + bounds.width / 2),
          fullHeight / 2 - scale * (bounds.y + bounds.height / 2)
        ];

        d3.select(svgRef.current).transition().duration(750).call(
          zoomRef.current.transform as any,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
      }
    };

    // Center on specific node function with smooth zoom/pan transitions
    const centerOnNode = (nodeId: string) => {
      if (!svgRef.current || !zoomRef.current) return;
      
      const targetNode = data.nodes.find(n => n.id === nodeId);
      if (targetNode) {
        // Get node position from simulation or use stored position
        let nodeX: number = targetNode.x || 0;
        let nodeY: number = targetNode.y || 0;
        
        // If the node doesn't have position yet, try to get it from the simulation
        if (typeof targetNode.x !== 'number' || typeof targetNode.y !== 'number') {
          const simulationNode = simulation.nodes().find((n: any) => n.id === nodeId);
          if (simulationNode && typeof simulationNode.x === 'number' && typeof simulationNode.y === 'number') {
            nodeX = simulationNode.x;
            nodeY = simulationNode.y;
          } else {
            // If we still don't have a position, center on the canvas center
            nodeX = dimensions.width / 2;
            nodeY = dimensions.height / 2;
          }
        }
        
        const scale = 1.5; // Zoom level when centering on node
        const translate = [
          dimensions.width / 2 - scale * nodeX,
          dimensions.height / 2 - scale * nodeY
        ];

        d3.select(svgRef.current).transition().duration(750).call(
          zoomRef.current.transform as any,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );

        // Add a temporary pulse effect to the centered node
        const centeredNodeElement = container.select(`circle[data-node-id="${nodeId}"]`);
        if (!centeredNodeElement.empty()) {
          centeredNodeElement
            .transition()
            .duration(300)
            .attr("r", 12)
            .transition()
            .duration(300)
            .attr("r", 8);
        }
      }
    };

    // Store functions in parent's refs
    if (typeof onFitToScreen === 'object' && onFitToScreen !== null && 'current' in onFitToScreen) {
      (onFitToScreen as any).current = fitToScreen;
    }
    
    if (typeof onCenterOnNode === 'object' && onCenterOnNode !== null && 'current' in onCenterOnNode) {
      (onCenterOnNode as any).current = centerOnNode;
    }

  }, [data, dimensions.width, dimensions.height]);

  // Update visual styling when selection or highlights change (without recreating elements)
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Update node styling
    container.selectAll(".nodes circle")
      .attr("stroke", (d: any) => {
        const isSelected = selectedItem?.type === 'node' && selectedItem.item.id === d.id;
        const isHighlighted = searchHighlights.includes(d.id);
        return isSelected ? '#ffffff' : isHighlighted ? '#f59e0b' : '#333';
      })
      .attr("stroke-width", (d: any) => {
        const isSelected = selectedItem?.type === 'node' && selectedItem.item.id === d.id;
        const isHighlighted = searchHighlights.includes(d.id);
        return isSelected || isHighlighted ? 3 : 1;
      });

    // Update link styling
    container.selectAll(".links line")
      .attr("stroke", (d: any) => {
        const isSelected = selectedItem?.type === 'edge' && selectedItem.item.id === d.id;
        return isSelected ? '#ffffff' : '#6b7280';
      })
      .attr("stroke-width", (d: any) => {
        const isSelected = selectedItem?.type === 'edge' && selectedItem.item.id === d.id;
        return isSelected ? 3 : 2;
      })
      .attr("marker-end", (d: any) => {
        if (d.directed) {
          const isSelected = selectedItem?.type === 'edge' && selectedItem.item.id === d.id;
          return isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)";
        }
        return null;
      });
  }, [selectedItem, searchHighlights]);

  // Handle context menu actions
  const handleCreateEdgeFromContext = (targetNode: ForceGraphNode) => {
    if (contextMenu.sourceNode && targetNode.id !== contextMenu.sourceNode.id) {
      onCreateEdge(contextMenu.sourceNode.id, targetNode.id);
    }
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleUnlinkEdge = (edgeId: string) => {
    if (onDeleteEdge) {
      onDeleteEdge(edgeId);
    }
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ background: '#0a0a0a' }}
      />
      
      {/* Enhanced Context Menu for Edge Creation */}
      {contextMenu.show && (() => {
        const connectedNodesInfo = contextMenu.sourceNode ? getConnectedNodesInfo(contextMenu.sourceNode.id) : [];
        const unconnectedNodes = contextMenu.sourceNode ? getUnconnectedNodes(contextMenu.sourceNode.id) : [];
        
        return (
          <div
            className="fixed z-50 bg-gray-800 border border-gray-600 rounded-md shadow-lg py-2 min-w-[250px] max-w-[350px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 text-sm text-gray-300 border-b border-gray-600">
              Node: <span className="text-white font-medium">{contextMenu.sourceNode?.label}</span>
            </div>
            
            {/* Connected Nodes Section */}
            {connectedNodesInfo.length > 0 && (
              <div className="border-b border-gray-600">
                <div className="px-3 py-2 text-xs text-gray-400 font-medium uppercase tracking-wide">
                  Connected Nodes ({connectedNodesInfo.length})
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {connectedNodesInfo.map(({ node, edgeId, isSource }) => (
                    <div
                      key={`connected-${node.id}`}
                      className="px-3 py-2 text-sm text-white hover:bg-gray-700 flex items-center justify-between group"
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                          style={{ backgroundColor: NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default }}
                        />
                        <span className="truncate">{node.label}</span>
                        <div className="ml-2 flex-shrink-0">
                          {isSource ? (
                            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlinkEdge(edgeId);
                        }}
                        className="ml-2 p-1 rounded hover:bg-red-600 text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        title="Unlink"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Unconnected Nodes Section */}
            {unconnectedNodes.length > 0 && (
              <div>
                <div className="px-3 py-2 text-xs text-gray-400 font-medium uppercase tracking-wide">
                  Unconnected Nodes ({unconnectedNodes.length})
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {unconnectedNodes.map(node => (
                    <button
                      key={`unconnected-${node.id}`}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 flex items-center group"
                      onClick={() => handleCreateEdgeFromContext(node)}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                        style={{ backgroundColor: NODE_TYPE_COLORS[node.type] || NODE_TYPE_COLORS.default }}
                      />
                      <span className="truncate flex-1">{node.label}</span>
                      <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Empty state */}
            {connectedNodesInfo.length === 0 && unconnectedNodes.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                No other nodes available
              </div>
            )}
            
            <div className="px-3 py-1 text-xs text-gray-500 border-t border-gray-600 mt-1">
              Click to connect • X to unlink
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default GraphCanvas; 