import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import {
  AppShell,
  Drawer,
  Group,
  Loader
} from '@mantine/core';
import { useDisclosure, useHotkeys, useMediaQuery } from '@mantine/hooks';
import { Edge, useReactFlow } from '@xyflow/react';
import { GlassPanel } from './ui/GlassPanel';
import { buildInstallmentGroups } from '../lib/encounters';
import { LocationFlowNode } from '../lib/graph';
import { DatasetWithRegion } from '../types/ui';
import { LocationDetailsPanel } from './LocationDetailsPanel';
import { useGraphDataset } from '../hooks/useGraphDataset';
import { GraphHeader } from './GraphHeader';
import { GraphSidebar } from './GraphSidebar';
import { GraphViewport } from './GraphViewport';
import type { PaletteItem } from './CommandPalette';
import type { FastRenderMode } from './GraphViewport';

const CommandPalette = lazy(() => import('./CommandPalette').then((module) => ({ default: module.CommandPalette })));

interface GraphCanvasProps {
  selectedFile: string;
  datasets: DatasetWithRegion[];
  onDatasetChange: (fileName: string) => void;
}

export function GraphCanvas({ selectedFile, datasets, onDatasetChange }: GraphCanvasProps) {
  const { fitView } = useReactFlow<LocationFlowNode, Edge>();
  const isMobile = useMediaQuery('(max-width: 62em)');
  const [navbarOpened, { toggle: toggleNavbar, close: closeNavbar }] = useDisclosure(false);
  const [asideOpened, { toggle: toggleAside, open: openAside, close: closeAside }] = useDisclosure(false);
  const [paletteOpened, { open: openPalette, close: closePalette }] = useDisclosure(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [fastRenderMode, setFastRenderMode] = useState<FastRenderMode>('fast');
  const [reachabilityMode, setReachabilityMode] = useState(false);
  const {
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
  } = useGraphDataset(
    selectedFile,
    datasets.map((dataset) => dataset.fileName)
  );

  const installmentGroups = useMemo(() => {
    if (!selectedLocation) {
      return [];
    }
    return buildInstallmentGroups(selectedLocation.region, selectedLocation.encounters);
  }, [selectedLocation]);

  const reachability = useMemo(() => {
    const empty = { nodeIds: new Set<string>(), edgeIds: new Set<string>() };

    if (!dataset || !selectedLocation || !reachabilityMode) {
      return empty;
    }

    const locationsById = new Map(dataset.locations.map((location) => [location.id, location]));
    const nodeIds = new Set<string>([selectedLocation.id]);
    const edgeIds = new Set<string>();
    const queue: string[] = [selectedLocation.id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) {
        continue;
      }

      const currentLocation = locationsById.get(currentId);
      if (!currentLocation) {
        continue;
      }

      for (const connection of currentLocation.connections) {
        edgeIds.add(`edge-${currentId}::${connection.to}`);
        if (!nodeIds.has(connection.to)) {
          nodeIds.add(connection.to);
          queue.push(connection.to);
        }
      }
    }

    return { nodeIds, edgeIds };
  }, [dataset, selectedLocation, reachabilityMode]);

  const clearSelection = useCallback(() => {
    clearSelectedLocation();
    if (isMobile) {
      closeAside();
    }
  }, [clearSelectedLocation, closeAside, isMobile]);

  useHotkeys([
    [
      'mod+K',
      (event) => {
        event.preventDefault();
        openPalette();
      }
    ]
  ]);

  const basePaletteItems = useMemo(() => {
    const actionItems: PaletteItem[] = [
      {
        key: 'action-reset-view',
        group: 'Actions',
        label: 'Reset graph view',
        description: 'Fit the full graph into view',
        kind: 'reset-view'
      },
      {
        key: 'action-clear-selection',
        group: 'Actions',
        label: 'Clear selected location',
        description: 'Close location details and reset selection',
        kind: 'clear-selection'
      }
    ];

    const datasetItems: PaletteItem[] = datasets.map((dataset) => ({
      key: `dataset-${dataset.fileName}`,
      group: 'Datasets',
      label: dataset.regionName,
      description: `${dataset.locations} locations • ${dataset.encounters} encounters`,
      kind: 'dataset',
      fileName: dataset.fileName
    }));

    const locationItems: PaletteItem[] =
      dataset?.locations.map((location) => ({
        key: `location-${location.id}`,
        group: 'Locations',
        label: location.name,
        description: `${location.region} • ${location.encounters.length} encounters`,
        kind: 'location',
        locationId: location.id
      })) ?? [];

    return [...actionItems, ...datasetItems, ...locationItems];
  }, [dataset?.locations, datasets]);

  const paletteItems = useMemo(() => {
    const normalizedQuery = paletteQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return basePaletteItems.slice(0, 40);
    }

    return basePaletteItems
      .filter((item) => {
        const haystack = `${item.label} ${item.description} ${item.group}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 40);
  }, [basePaletteItems, paletteQuery]);

  const runPaletteItem = useCallback((item: PaletteItem) => {
    if (item.kind === 'reset-view') {
      void fitView({ padding: 0.2, duration: 350, includeHiddenNodes: true });
    }

    if (item.kind === 'clear-selection') {
      clearSelection();
    }

    if (item.kind === 'dataset') {
      onDatasetChange(item.fileName);
      closeNavbar();
    }

    if (item.kind === 'location') {
      setSelectedLocationId(item.locationId);
      openAside();
    }

    setPaletteQuery('');
    closePalette();
  }, [clearSelection, closeNavbar, closePalette, fitView, onDatasetChange, openAside, setSelectedLocationId]);

  const handleSelectLocation = useCallback(
    (locationId: string) => {
      setSelectedLocationId(locationId);
      openAside();
    },
    [openAside, setSelectedLocationId]
  );

  const closePaletteAndResetQuery = useCallback(() => {
    setPaletteQuery('');
    closePalette();
  }, [closePalette]);

  return (
    <AppShell
      padding="md"
      header={{ height: 74 }}
      navbar={{ width: 360, breakpoint: 'md', collapsed: { mobile: !navbarOpened } }}
      aside={{ width: 330, breakpoint: 'md', collapsed: { mobile: true } }}
      h="100%"
      className="shell"
    >
      <AppShell.Header className="shell-header">
        <GraphHeader
          navbarOpened={navbarOpened}
          asideOpened={asideOpened}
          onToggleNavbar={toggleNavbar}
          onToggleAside={toggleAside}
          onOpenCommandPalette={openPalette}
        />
      </AppShell.Header>

      <AppShell.Navbar p="md" className="shell-navbar">
        <GraphSidebar
          selectedFile={selectedFile}
          datasets={datasets}
          onDatasetChange={onDatasetChange}
          onCloseNavbar={closeNavbar}
          nodeCount={nodes.length}
          edgeCount={edges.length}
          generatedAt={dataset?.generatedAt}
          fastRenderMode={fastRenderMode}
          onFastRenderModeChange={setFastRenderMode}
          reachabilityMode={reachabilityMode}
          onReachabilityModeChange={setReachabilityMode}
          hasSelectedLocation={Boolean(selectedLocation)}
          reachableNodesCount={Math.max(0, reachability.nodeIds.size - 1)}
        />
      </AppShell.Navbar>

      <AppShell.Main className="shell-main">
        <GraphViewport
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          loading={loading}
          error={error}
          onSelectLocation={handleSelectLocation}
          renderMode={fastRenderMode}
          reachabilityMode={reachabilityMode}
          reachableNodeIds={reachability.nodeIds}
          reachableEdgeIds={reachability.edgeIds}
        />
      </AppShell.Main>

      <AppShell.Aside p="md" className="shell-aside">
        <GlassPanel h="100%">
          <LocationDetailsPanel
            selectedLocation={selectedLocation}
            installmentGroups={installmentGroups}
            onClear={clearSelection}
            encounterScrollHeight={280}
            connectionsScrollHeight={180}
          />
        </GlassPanel>
      </AppShell.Aside>

      <Drawer
        opened={asideOpened}
        onClose={closeAside}
        position="bottom"
        size="78%"
        withCloseButton={false}
        hiddenFrom="md"
        classNames={{ content: 'details-drawer-content', body: 'details-drawer-body' }}
        transitionProps={{ transition: 'slide-up', duration: 220 }}
      >
        <LocationDetailsPanel
          selectedLocation={selectedLocation}
          installmentGroups={installmentGroups}
          onClear={clearSelection}
          encounterScrollHeight={220}
          connectionsScrollHeight={150}
        />
      </Drawer>

      {paletteOpened && (
        <Suspense
          fallback={
            <Group className="graph-overlay" justify="center" align="center">
              <Loader color="violet" />
            </Group>
          }
        >
          <CommandPalette
            opened={paletteOpened}
            onClose={closePaletteAndResetQuery}
            query={paletteQuery}
            onQueryChange={setPaletteQuery}
            items={paletteItems}
            onRunItem={runPaletteItem}
          />
        </Suspense>
      )}
    </AppShell>
  );
}
