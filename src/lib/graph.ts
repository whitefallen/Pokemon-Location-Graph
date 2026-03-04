import dagre from 'dagre';
import { Edge, MarkerType, Node } from '@xyflow/react';
import type { LocationNodeData } from '../components/LocationNode';
import { LocationDataset } from '../types';
import { countUniquePokemon } from './encounters';

export type LocationFlowNode = Node<LocationNodeData, 'location'>;

const NODE_WIDTH = 270;
const NODE_HEIGHT = 104;

export function buildGraph(dataset: LocationDataset): { nodes: LocationFlowNode[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 70, marginx: 40, marginy: 40 });

  const nodes: LocationFlowNode[] = dataset.locations.map((location) => {
    dagreGraph.setNode(location.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    return {
      id: location.id,
      type: 'location',
      position: { x: 0, y: 0 },
      data: {
        name: location.name,
        region: location.region,
        encounterCount: location.encounters.length,
        uniquePokemonCount: countUniquePokemon(location)
      }
    };
  });

  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const location of dataset.locations) {
    for (const connection of location.connections) {
      const edgeKey = `${location.id}::${connection.to}`;
      if (seen.has(edgeKey)) {
        continue;
      }
      seen.add(edgeKey);
      dagreGraph.setEdge(location.id, connection.to);
      edges.push({
        id: `edge-${edgeKey}`,
        source: location.id,
        target: connection.to,
        label: connection.dir,
        markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22 },
        type: 'smoothstep',
        animated: connection.dir === 'contains',
        labelStyle: { fontSize: 11, fontWeight: 700 },
        style: { strokeWidth: 1.5 }
      });
    }
  }

  dagre.layout(dagreGraph);

  for (const node of nodes) {
    const positioned = dagreGraph.node(node.id);
    node.position = {
      x: positioned.x - NODE_WIDTH / 2,
      y: positioned.y - NODE_HEIGHT / 2
    };
  }

  return { nodes, edges };
}
