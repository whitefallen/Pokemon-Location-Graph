import { useMemo } from 'react';
import { Group, Loader, Text } from '@mantine/core';
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MiniMap,
  Node,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow
} from '@xyflow/react';
import { LocationNode, LocationNodeData } from './LocationNode';
import { GraphSurface } from './ui/GraphSurface';

const nodeTypes = {
  location: LocationNode
};

type LocationFlowNode = Node<LocationNodeData, 'location'>;

export type FastRenderMode = 'fast' | 'quality' | 'auto';

interface GraphViewportProps {
  nodes: LocationFlowNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<LocationFlowNode>;
  onEdgesChange: OnEdgesChange<Edge>;
  loading: boolean;
  error: string | null;
  onSelectLocation: (locationId: string) => void;
  renderMode: FastRenderMode;
  reachabilityMode: boolean;
  reachableNodeIds: Set<string>;
  reachableEdgeIds: Set<string>;
}

export function GraphViewport({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  loading,
  error,
  onSelectLocation,
  renderMode,
  reachabilityMode,
  reachableNodeIds,
  reachableEdgeIds
}: GraphViewportProps) {
  const isPerformanceLite =
    renderMode === 'fast' || (renderMode === 'auto' && (nodes.length >= 70 || edges.length >= 120));

  const nodesForRender = useMemo(() => {
    if (!reachabilityMode || reachableNodeIds.size === 0) {
      return nodes;
    }

    return nodes.map((node) => {
      const existingClassName = node.className ? `${node.className} ` : '';
      const reachabilityClassName = reachableNodeIds.has(node.id) ? 'node-reachable' : 'node-dimmed';
      return {
        ...node,
        className: `${existingClassName}${reachabilityClassName}`
      };
    });
  }, [nodes, reachabilityMode, reachableNodeIds]);

  const edgesForRender = useMemo(() => {
    const shouldApplyReachability = reachabilityMode && reachableEdgeIds.size > 0;

    let changed = false;
    const optimizedEdges = edges.map((edge) => {
      let updatedEdge = edge;

      if (isPerformanceLite && (edge.animated || edge.label || edge.labelStyle)) {
        updatedEdge = {
          ...updatedEdge,
          animated: false,
          label: undefined,
          labelStyle: undefined
        };
        changed = true;
      }

      if (shouldApplyReachability) {
        const existingClassName = updatedEdge.className ? `${updatedEdge.className} ` : '';
        const reachabilityClassName = reachableEdgeIds.has(updatedEdge.id) ? 'edge-reachable' : 'edge-dimmed';
        const nextClassName = `${existingClassName}${reachabilityClassName}`;
        if (updatedEdge.className !== nextClassName) {
          updatedEdge = { ...updatedEdge, className: nextClassName };
          changed = true;
        }
      }

      return updatedEdge;
    });

    return changed ? optimizedEdges : edges;
  }, [edges, isPerformanceLite, reachabilityMode, reachableEdgeIds]);

  return (
    <GraphSurface h="100%">
      {loading && (
        <Group className="graph-overlay" justify="center" align="center">
          <Loader type="bars" color="violet" />
        </Group>
      )}
      {error && (
        <Group className="graph-overlay" justify="center" align="center">
          <Text c="red.4" fw={600}>
            {error}
          </Text>
        </Group>
      )}
      <div className="graph-flow">
        <ReactFlow<LocationFlowNode, Edge>
          className={`spiced-flow ${isPerformanceLite ? 'graph-lite' : ''} ${reachabilityMode ? 'reachability-mode' : ''}`}
          nodes={nodesForRender}
          edges={edgesForRender}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => onSelectLocation(node.id)}
          nodeTypes={nodeTypes}
          onlyRenderVisibleElements
          minZoom={0.2}
          maxZoom={1.8}
          fitView
          attributionPosition="bottom-left"
          colorMode="dark"
        >
          {!isPerformanceLite && (
            <Background id="graph-lines" variant={BackgroundVariant.Lines} gap={72} size={1} color="rgba(130, 150, 255, 0.08)" />
          )}
          {!isPerformanceLite && <Background id="graph-dots" variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(177, 189, 255, 0.16)" />}
          {!isPerformanceLite && <MiniMap pannable zoomable className="minimap" />}
          <Controls />
        </ReactFlow>
      </div>
    </GraphSurface>
  );
}
