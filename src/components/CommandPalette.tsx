import { Badge, Group, Kbd, Modal, ScrollArea, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { IconCommand, IconSearch } from '@tabler/icons-react';

export type PaletteItem =
  | { key: string; group: 'Actions'; label: string; description: string; kind: 'reset-view' | 'clear-selection' }
  | { key: string; group: 'Datasets'; label: string; description: string; kind: 'dataset'; fileName: string }
  | { key: string; group: 'Locations'; label: string; description: string; kind: 'location'; locationId: string };

interface CommandPaletteProps {
  opened: boolean;
  query: string;
  items: PaletteItem[];
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onRunItem: (item: PaletteItem) => void;
}

export function CommandPalette({ opened, query, items, onClose, onQueryChange, onRunItem }: CommandPaletteProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs" align="center">
          <IconCommand size={16} />
          <Text fw={700}>Command Palette</Text>
          <Kbd ml="xs">Ctrl + K</Kbd>
        </Group>
      }
      centered
      size="lg"
      classNames={{ content: 'command-palette-content' }}
    >
      <TextInput
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        placeholder="Search commands, datasets, locations..."
        autoFocus
        leftSection={<IconSearch size={16} />}
      />
      <ScrollArea h={340} mt="sm">
        <Stack gap={4}>
          {items.map((item) => (
            <UnstyledButton key={item.key} className="command-item" onClick={() => onRunItem(item)}>
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack gap={2}>
                  <Text fw={600} size="sm">
                    {item.label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {item.description}
                  </Text>
                </Stack>
                <Badge variant="light" size="sm" color="grape">
                  {item.group}
                </Badge>
              </Group>
            </UnstyledButton>
          ))}
          {items.length === 0 && (
            <Text size="sm" c="dimmed" py="sm">
              No matches for “{query}”.
            </Text>
          )}
        </Stack>
      </ScrollArea>
    </Modal>
  );
}
