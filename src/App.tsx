import { lazy, Suspense, useMemo, useState } from 'react';
import { Card, Group, Loader, Select, Stack, Switch, Text } from '@mantine/core';
import { formatRegionName } from './lib/format';
import { useDatasets } from './hooks/useDatasets';

const GraphExperience = lazy(() => import('./components/GraphExperience').then((module) => ({ default: module.GraphExperience })));

function App() {
  const { datasets, selectedFile, setSelectedFile, isLoading, error } = useDatasets();
  const [cinematicMode, setCinematicMode] = useState(false);
  const datasetSelectOptions = useMemo(
    () =>
      datasets.map((dataset) => ({
        value: dataset.fileName,
        label: `${formatRegionName(dataset.regionName)} • ${dataset.locations} loc • ${dataset.encounters} encounters`
      })),
    [datasets]
  );

  if (isLoading || !selectedFile) {
    return (
      <Group h="100vh" justify="center" align="center">
        <Loader color="violet" />
      </Group>
    );
  }

  if (error) {
    return (
      <Group h="100vh" justify="center" align="center">
        <Text c="red.4" fw={600}>
          {error}
        </Text>
      </Group>
    );
  }

  return (
    <Stack gap={0} h="100vh" className={`app-root ${cinematicMode ? 'cinematic-mode' : ''}`}>
      <Card radius={0} py="xs" px="md" className="dataset-strip">
        <Group justify="space-between" align="center" wrap="wrap">
          <Text size="sm" c="dimmed">
            Loaded datasets: {datasets.length}
          </Text>
          <Group gap="sm" wrap="wrap" justify="flex-end" style={{ marginLeft: 'auto' }}>
            <Switch
              checked={cinematicMode}
              onChange={(event) => setCinematicMode(event.currentTarget.checked)}
              label="Cinematic"
              aria-label="Toggle cinematic desktop visuals"
              className="cinematic-toggle"
            />
            <Select
              value={selectedFile}
              aria-label="Select dataset from header"
              onChange={(value) => value && setSelectedFile(value)}
              w={{ base: '100%', sm: 340 }}
              searchable
              data={datasetSelectOptions}
            />
          </Group>
        </Group>
      </Card>
      <div className="app-graph-shell">
        <Suspense
          fallback={
            <Group h="100%" justify="center" align="center">
              <Loader color="violet" />
            </Group>
          }
        >
          <GraphExperience
            selectedFile={selectedFile}
            datasets={datasets}
            onDatasetChange={(value) => setSelectedFile(value)}
          />
        </Suspense>
      </div>
    </Stack>
  );
}

export default App;
