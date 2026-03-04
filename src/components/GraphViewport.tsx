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
}

export function GraphViewport({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  loading,
  error,
  onSelectLocation,
  renderMode
}: GraphViewportProps) {
  const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
  const isPerformanceLite =
    renderMode === 'fast' ||
    (renderMode === 'auto' && (isFirefox ? nodes.length >= 45 || edges.length >= 80 : nodes.length >= 70 || edges.length >= 120));

  const edgesForRender = useMemo(() => {
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

      return updatedEdge;
    });

    return changed ? optimizedEdges : edges;
  }, [edges, isPerformanceLite]);

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
          className={`spiced-flow ${isPerformanceLite ? 'graph-lite' : ''}`}
          nodes={nodes}
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
