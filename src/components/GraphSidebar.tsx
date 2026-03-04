import { Badge, Divider, Group, SegmentedControl, Select, Stack, Switch, Text } from '@mantine/core';
import { IconRoute } from '@tabler/icons-react';
import { GlassPanel } from './ui/GlassPanel';
import { DatasetWithRegion } from '../types/ui';
import { formatRegionName } from '../lib/format';
import { FastRenderMode } from './GraphViewport';

interface GraphSidebarProps {
  selectedFile: string;
  datasets: DatasetWithRegion[];
  onDatasetChange: (fileName: string) => void;
  onCloseNavbar: () => void;
  nodeCount: number;
  edgeCount: number;
  generatedAt?: string;
  fastRenderMode: FastRenderMode;
  onFastRenderModeChange: (mode: FastRenderMode) => void;
  reachabilityMode: boolean;
  onReachabilityModeChange: (enabled: boolean) => void;
  hasSelectedLocation: boolean;
  reachableNodesCount: number;
}

export function GraphSidebar({
  selectedFile,
  datasets,
  onDatasetChange,
  onCloseNavbar,
  nodeCount,
  edgeCount,
  generatedAt,
  fastRenderMode,
  onFastRenderModeChange,
  reachabilityMode,
  onReachabilityModeChange,
  hasSelectedLocation,
  reachableNodesCount
}: GraphSidebarProps) {
  return (
    <Stack gap="md" h="100%">
      <GlassPanel>
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={700}>Dataset</Text>
            <Badge variant="light" color="indigo">
              encounters
            </Badge>
          </Group>
          <Select
            value={selectedFile}
            aria-label="Select dataset from sidebar"
            onChange={(value) => {
              if (!value) {
                return;
              }
              onDatasetChange(value);
              onCloseNavbar();
            }}
            searchable
            data={datasets.map((dataset) => ({
              value: dataset.fileName,
              label: `${formatRegionName(dataset.regionName)} • ${dataset.locations} loc • ${dataset.encounters} encounters`
            }))}
          />
          <Text size="xs" c="dimmed">
            Choose a dataset here or from the top selector.
          </Text>
        </Stack>
      </GlassPanel>

      <GlassPanel>
        <Stack gap="sm">
          <Text fw={700}>Render & Reachability</Text>
          <SegmentedControl
            value={fastRenderMode}
            onChange={(value) => onFastRenderModeChange(value as FastRenderMode)}
            data={[
              { label: 'Fast', value: 'fast' },
              { label: 'Auto', value: 'auto' },
              { label: 'Quality', value: 'quality' }
            ]}
            fullWidth
          />
          <Switch
            checked={reachabilityMode}
            onChange={(event) => onReachabilityModeChange(event.currentTarget.checked)}
            disabled={!hasSelectedLocation}
            label="Reachability mode"
            description={hasSelectedLocation ? `${reachableNodesCount} reachable locations` : 'Select a location first'}
          />
        </Stack>
      </GlassPanel>

      <GlassPanel>
        <Group justify="space-between">
          <Text fw={700}>Graph Metrics</Text>
          <IconRoute size={17} />
        </Group>
        <Divider my="sm" />
        <Stack gap={8}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Locations
            </Text>
            <Badge color="violet">{nodeCount}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Connections
            </Text>
            <Badge color="blue">{edgeCount}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Generated
            </Text>
            <Text size="sm">{generatedAt ? new Date(generatedAt).toLocaleDateString() : '-'}</Text>
          </Group>
        </Stack>
      </GlassPanel>
      <Text size="xs" c="dimmed" ta="center" mt="auto">
        Tip: click a node to inspect encounter methods.
      </Text>
    </Stack>
  );
}
