import { lazy, Suspense } from 'react';
import { Button, Group, Loader, Stack, Text } from '@mantine/core';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useDatasets } from './hooks/useDatasets';

const GraphExperience = lazy(() => import('./components/GraphExperience').then((module) => ({ default: module.GraphExperience })));

function App() {
  const { datasets, selectedFile, setSelectedFile, isLoading, error } = useDatasets();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW: (_, registration) => {
      if (!registration) {
        return;
      }

      window.setInterval(() => {
        void registration.update();
      }, 60 * 60 * 1000);
    }
  });

  const dismissSwMessage = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

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
    <Stack gap={0} h="100vh" className="app-root">
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
      {(offlineReady || needRefresh) && (
        <div className="pwa-toast">
          <Text size="sm" fw={600}>
            {needRefresh ? 'A new version is available.' : 'App is ready for offline use.'}
          </Text>
          <Group gap="xs" justify="flex-end" mt={8}>
            {needRefresh && (
              <Button size="xs" color="violet" onClick={() => void updateServiceWorker(true)}>
                Update now
              </Button>
            )}
            <Button size="xs" variant="subtle" color="gray" onClick={dismissSwMessage}>
              Dismiss
            </Button>
          </Group>
        </div>
      )}
    </Stack>
  );
}

export default App;
