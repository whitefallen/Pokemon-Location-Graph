import { useEffect, useState } from 'react';
import { dataAssetUrl } from '../lib/assets';
import { ManifestFile } from '../types';
import { DatasetWithRegion } from '../types/ui';

interface UseDatasetsResult {
  datasets: DatasetWithRegion[];
  selectedFile: string | null;
  setSelectedFile: (fileName: string | null) => void;
  isLoading: boolean;
  error: string | null;
}

export function useDatasets(): UseDatasetsResult {
  const [datasets, setDatasets] = useState<DatasetWithRegion[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadManifest = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(dataAssetUrl('manifest.json'));
        if (!response.ok) {
          throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
        }

        const manifest = (await response.json()) as ManifestFile;
        const datasetsWithRegions = manifest.datasets.map((dataset) => ({
          ...dataset,
          regionName: dataset.label
        }));

        if (cancelled) {
          return;
        }

        setDatasets(datasetsWithRegions);
        setSelectedFile((current) => current ?? datasetsWithRegions[0]?.fileName ?? null);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unknown loading error');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  return { datasets, selectedFile, setSelectedFile, isLoading, error };
}
