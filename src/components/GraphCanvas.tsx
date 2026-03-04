import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
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
import { useCaughtChecklist } from '../hooks/useCaughtChecklist';
import { GraphHeader } from './GraphHeader';
import { GraphSidebar } from './GraphSidebar';
import { GraphViewport } from './GraphViewport';
import { ChecklistModal } from './ChecklistModal';
import type { PaletteItem } from './CommandPalette';
import type { FastRenderMode } from './GraphViewport';

const CommandPalette = lazy(() => import('./CommandPalette').then((module) => ({ default: module.CommandPalette })));
const CHECKLIST_LAST_GENERATION_STORAGE_KEY = 'pokemon-location-graph:last-generation-by-dataset:v1';

function readLastGenerationByDataset(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CHECKLIST_LAST_GENERATION_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

function writeLastGenerationByDataset(payload: Record<string, string>): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (Object.keys(payload).length === 0) {
    window.localStorage.removeItem(CHECKLIST_LAST_GENERATION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(CHECKLIST_LAST_GENERATION_STORAGE_KEY, JSON.stringify(payload));
}

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
  const [checklistOpened, { open: openChecklist, close: closeChecklist }] = useDisclosure(false);
  const [focusedChecklistGenerationKey, setFocusedChecklistGenerationKey] = useState<string | null>(null);
  const [lastChecklistGenerationKey, setLastChecklistGenerationKey] = useState<string | null>(null);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [fastRenderMode, setFastRenderMode] = useState<FastRenderMode>('fast');
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

  const { groupedChecklist, completionByGeneration, incompleteLocations, isCaught, toggleCaught, resetChecklist } = useCaughtChecklist(
    selectedFile,
    dataset
  );

  useEffect(() => {
    const mapping = readLastGenerationByDataset();
    setLastChecklistGenerationKey(mapping[selectedFile] ?? null);
  }, [selectedFile]);

  useEffect(() => {
    const mapping = readLastGenerationByDataset();

    if (!lastChecklistGenerationKey) {
      delete mapping[selectedFile];
      writeLastGenerationByDataset(mapping);
      return;
    }

    mapping[selectedFile] = lastChecklistGenerationKey;
    writeLastGenerationByDataset(mapping);
  }, [lastChecklistGenerationKey, selectedFile]);

  const checklistTotalCount = useMemo(() => {
    return groupedChecklist.reduce((sum, generationGroup) => sum + generationGroup.locations.length, 0);
  }, [groupedChecklist]);

  const selectedLocationChecklistCompletion = useMemo(() => {
    if (!selectedLocation) {
      return [];
    }

    return groupedChecklist
      .map((generationGroup) => {
        const completion = completionByGeneration
          .find((entry) => entry.generationKey === generationGroup.generationKey)
          ?.locations[selectedLocation.id];

        if (!completion || completion.total === 0) {
          return null;
        }

        return {
          generationKey: generationGroup.generationKey,
          generationLabel: generationGroup.generationLabel,
          caught: completion.caught,
          total: completion.total,
          complete: completion.complete
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [completionByGeneration, groupedChecklist, selectedLocation]);

  const installmentGroups = useMemo(() => {
    if (!selectedLocation) {
      return [];
    }
    return buildInstallmentGroups(selectedLocation.region, selectedLocation.encounters);
  }, [selectedLocation]);

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

  const openChecklistForGeneration = useCallback(
    (generationKey: string) => {
      setFocusedChecklistGenerationKey(generationKey);
      setLastChecklistGenerationKey(generationKey);
      openChecklist();
    },
    [openChecklist]
  );

  const openChecklistFromSidebar = useCallback(() => {
    setFocusedChecklistGenerationKey(lastChecklistGenerationKey);
    openChecklist();
  }, [lastChecklistGenerationKey, openChecklist]);

  const rememberChecklistGeneration = useCallback((generationKey: string) => {
    setLastChecklistGenerationKey(generationKey);
  }, []);

  const handleResetChecklist = useCallback(() => {
    resetChecklist();
    setLastChecklistGenerationKey(null);
    writeLastGenerationByDataset({});
  }, [resetChecklist]);

  const closeChecklistAndClearFocus = useCallback(() => {
    setFocusedChecklistGenerationKey(null);
    closeChecklist();
  }, [closeChecklist]);

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
          incompleteChecklistCount={incompleteLocations.length}
          checklistTotalCount={checklistTotalCount}
          onOpenChecklist={openChecklistFromSidebar}
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
        />
      </AppShell.Main>

      <AppShell.Aside p="md" className="shell-aside">
        <GlassPanel h="100%">
          <LocationDetailsPanel
            selectedLocation={selectedLocation}
            installmentGroups={installmentGroups}
            checklistCompletion={selectedLocationChecklistCompletion}
            onOpenChecklistGeneration={openChecklistForGeneration}
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
          checklistCompletion={selectedLocationChecklistCompletion}
          onOpenChecklistGeneration={openChecklistForGeneration}
          onClear={clearSelection}
          encounterScrollHeight={220}
          connectionsScrollHeight={150}
        />
      </Drawer>

      <ChecklistModal
        opened={checklistOpened}
        onClose={closeChecklistAndClearFocus}
        groupedChecklist={groupedChecklist}
        completionByGeneration={completionByGeneration}
        focusedGenerationKey={focusedChecklistGenerationKey}
        onGenerationFocused={rememberChecklistGeneration}
        isCaught={isCaught}
        onToggleCaught={toggleCaught}
        onResetChecklist={handleResetChecklist}
      />

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
