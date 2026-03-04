import { memo } from 'react';
import { Badge, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconMapPin, IconPokeball } from '@tabler/icons-react';
import { Handle, Position } from '@xyflow/react';

export interface LocationNodeData {
  name: string;
  region: string;
  encounterCount: number;
  uniquePokemonCount: number;
  [key: string]: unknown;
}

interface LocationNodeProps {
  data: LocationNodeData;
}

export const LocationNode = memo(function LocationNode({ data }: LocationNodeProps) {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <Stack gap={8} className="location-node">
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon size="sm" variant="light" color="violet">
              <IconMapPin size={14} />
            </ThemeIcon>
            <Text fw={700} size="sm" className="location-node-title" lineClamp={1}>
              {data.name}
            </Text>
          </Group>
          <Badge variant="dot" color="indigo" tt="capitalize">
            {data.region}
          </Badge>
        </Group>
        <Group gap="xs" justify="space-between" wrap="nowrap">
          <Badge color="teal" variant="light">
            {data.encounterCount} encounters
          </Badge>
          <Group gap={6} wrap="nowrap">
            <IconPokeball size={14} />
            <Text size="xs" c="dimmed">
              {data.uniquePokemonCount} species
            </Text>
          </Group>
        </Group>
      </Stack>
      <Handle type="source" position={Position.Right} />
    </>
  );
});