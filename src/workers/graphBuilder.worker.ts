import { buildGraph } from '../lib/graph';
import { LocationDataset } from '../types';

type BuildRequestMessage = {
  id: number;
  dataset: LocationDataset;
};

type BuildSuccessMessage = {
  id: number;
  graph: ReturnType<typeof buildGraph>;
};

type BuildErrorMessage = {
  id: number;
  error: string;
};

self.onmessage = (event: MessageEvent<BuildRequestMessage>) => {
  const { id, dataset } = event.data;

  try {
    const graph = buildGraph(dataset);
    const message: BuildSuccessMessage = { id, graph };
    self.postMessage(message);
  } catch (error) {
    const message: BuildErrorMessage = {
      id,
      error: error instanceof Error ? error.message : 'Unknown graph build error'
    };
    self.postMessage(message);
  }
};
