import { useEffect, useMemo, useState } from 'react';
import { Edge, useEdgesState, useNodesState, useReactFlow } from '@xyflow/react';
import { dataAssetUrl } from '../lib/assets';
import { buildGraph, LocationFlowNode, NODE_HEIGHT, NODE_WIDTH } from '../lib/graph';
import { LocationDataset } from '../types';

const datasetCache = new Map<string, LocationDataset>();
const graphCache = new Map<string, { nodes: LocationFlowNode[]; edges: Edge[] }>();

type WorkerSuccessMessage = {
  id: number;
  graph: { nodes: LocationFlowNode[]; edges: Edge[] };
};

type WorkerErrorMessage = {
  id: number;
  error: string;
};

let graphWorker: Worker | null | undefined;
let workerRequestId = 0;
const workerPending = new Map<
  number,
  {
    resolve: (graph: { nodes: LocationFlowNode[]; edges: Edge[] }) => void;
    reject: (error: Error) => void;
  }
>();

function getGraphWorker(): Worker | null {
  if (graphWorker !== undefined) {
    return graphWorker;
  }

  if (typeof Worker === 'undefined') {
    graphWorker = null;
    return graphWorker;
  }

  graphWorker = new Worker(new URL('../workers/graphBuilder.worker.ts', import.meta.url), { type: 'module' });
  graphWorker.onmessage = (event: MessageEvent<WorkerSuccessMessage | WorkerErrorMessage>) => {
    const message = event.data;
    const pending = workerPending.get(message.id);
    if (!pending) {
      return;
    }

    workerPending.delete(message.id);
    if ('error' in message) {
      pending.reject(new Error(message.error));
      return;
    }

    pending.resolve(message.graph);
  };

  graphWorker.onerror = (event) => {
    const error = new Error(event.message || 'Graph worker execution failed');
    for (const pending of workerPending.values()) {
      pending.reject(error);
    }
    workerPending.clear();
    graphWorker = null;
  };

  return graphWorker;
}

async function buildGraphAsync(dataset: LocationDataset): Promise<{ nodes: LocationFlowNode[]; edges: Edge[] }> {
  return buildGraphAsyncWithStart(dataset, undefined);
}

async function buildGraphAsyncWithStart(
  dataset: LocationDataset,
  startLocationId?: string
): Promise<{ nodes: LocationFlowNode[]; edges: Edge[] }> {
  const worker = getGraphWorker();
  if (!worker) {
    return buildGraph(dataset, startLocationId);
  }

  const id = ++workerRequestId;
  const response = new Promise<{ nodes: LocationFlowNode[]; edges: Edge[] }>((resolve, reject) => {
    workerPending.set(id, { resolve, reject });
  });

  worker.postMessage({ id, dataset, startLocationId });
  return response;
}

async function loadDatasetPayload(fileName: string): Promise<LocationDataset> {
  const cached = datasetCache.get(fileName);
  if (cached) {
    return cached;
  }

  const response = await fetch(dataAssetUrl(fileName));
  if (!response.ok) {
    throw new Error(`Failed to load dataset: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as LocationDataset;
  datasetCache.set(fileName, payload);
  return payload;
}

function cloneNodes(nodes: LocationFlowNode[]): LocationFlowNode[] {
  return nodes.map((node) => ({
    ...node,
    data: { ...node.data },
    position: { ...node.position }
  }));
}

function cloneEdges(edges: Edge[]): Edge[] {
  return edges.map((edge) => ({
    ...edge,
    markerEnd: edge.markerEnd,
    style: edge.style ? { ...edge.style } : edge.style,
    labelStyle: edge.labelStyle ? { ...edge.labelStyle } : edge.labelStyle
  }));
}

interface UseGraphDatasetResult {
  nodes: LocationFlowNode[];
  edges: Edge[];
  onNodesChange: ReturnType<typeof useNodesState<LocationFlowNode>>[2];
  onEdgesChange: ReturnType<typeof useEdgesState<Edge>>[2];
  dataset: LocationDataset | null;
  loading: boolean;
  error: string | null;
  selectedLocation: LocationDataset['locations'][number] | null;
  setSelectedLocationId: (id: string | null) => void;
  clearSelectedLocation: () => void;
}

export function useGraphDataset(selectedFile: string, datasetFiles?: string[], startLocationId?: string): UseGraphDatasetResult {
  const { fitView, setCenter } = useReactFlow<LocationFlowNode, Edge>();
  const [nodes, setNodes, onNodesChange] = useNodesState<LocationFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [dataset, setDataset] = useState<LocationDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedLocationId(null);

        const payload = await loadDatasetPayload(selectedFile);
        if (cancelled) {
          return;
        }

        const graphCacheKey = `${selectedFile}::${startLocationId ?? ''}`;
        let graph = graphCache.get(graphCacheKey);
        if (!graph) {
          graph = await buildGraphAsyncWithStart(payload, startLocationId);
          graphCache.set(graphCacheKey, {
            nodes: cloneNodes(graph.nodes),
            edges: cloneEdges(graph.edges)
          });
        }

        setDataset(payload);
        setNodes(cloneNodes(graph.nodes));
        setEdges(cloneEdges(graph.edges));

        requestAnimationFrame(() => {
          const shouldAnimateFit = payload.locations.length < 70;
          if (startLocationId) {
            const startNode = graph?.nodes.find((node) => node.id === startLocationId);
            if (startNode && Number.isFinite(startNode.position.x) && Number.isFinite(startNode.position.y)) {
              void setCenter(startNode.position.x + NODE_WIDTH / 2, startNode.position.y + NODE_HEIGHT / 2, {
                zoom: 0.85,
                duration: shouldAnimateFit ? 260 : 0
              });
              return;
            }
          }

          void fitView({
            padding: 0.2,
            duration: shouldAnimateFit ? 260 : 0,
            includeHiddenNodes: true
          });
        });
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unknown loading error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fitView, selectedFile, setCenter, setEdges, setNodes, startLocationId]);

  useEffect(() => {
    const files = datasetFiles ?? [];
    const candidates = files.filter((fileName) => fileName !== selectedFile && !graphCache.has(`${fileName}::`));
    if (candidates.length === 0) {
      return;
    }

    let cancelled = false;
    const maxPrefetch = Math.min(2, candidates.length);
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const prefetch = async () => {
      for (const fileName of candidates.slice(0, maxPrefetch)) {
        if (cancelled || graphCache.has(`${fileName}::`)) {
          continue;
        }

        try {
          const payload = await loadDatasetPayload(fileName);
          if (cancelled || graphCache.has(`${fileName}::`)) {
            continue;
          }

          const graph = await buildGraphAsync(payload);
          if (cancelled) {
            continue;
          }

          graphCache.set(`${fileName}::`, {
            nodes: cloneNodes(graph.nodes),
            edges: cloneEdges(graph.edges)
          });
        } catch {
          return;
        }
      }
    };

    const usedIdleCallback = typeof idleWindow.requestIdleCallback === 'function';
    const idleHandle = usedIdleCallback
      ? idleWindow.requestIdleCallback!(() => {
          void prefetch();
        }, { timeout: 1200 })
      : window.setTimeout(() => {
          void prefetch();
        }, 450);

    return () => {
      cancelled = true;
      if (usedIdleCallback && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleHandle as number);
      } else {
        window.clearTimeout(idleHandle as number);
      }
    };
  }, [datasetFiles, selectedFile]);

  const selectedLocation = useMemo(() => {
    if (!dataset || !selectedLocationId) {
      return null;
    }
    return dataset.locations.find((location) => location.id === selectedLocationId) ?? null;
  }, [dataset, selectedLocationId]);

  const clearSelectedLocation = () => setSelectedLocationId(null);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    dataset,
    loading,
    error,
    selectedLocation,
    setSelectedLocationId,
    clearSelectedLocation
  };
}
