import { ReactFlowProvider } from '@xyflow/react';
import { GraphCanvas } from './GraphCanvas';
import { DatasetWithRegion } from '../types/ui';

interface GraphExperienceProps {
  selectedFile: string;
  datasets: DatasetWithRegion[];
  onDatasetChange: (fileName: string) => void;
}

export function GraphExperience({ selectedFile, datasets, onDatasetChange }: GraphExperienceProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas selectedFile={selectedFile} datasets={datasets} onDatasetChange={onDatasetChange} />
    </ReactFlowProvider>
  );
}
