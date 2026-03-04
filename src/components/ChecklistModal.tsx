import {
  Accordion,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Progress,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon
} from '@mantine/core';
import { IconChecklist, IconRefresh } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { GenerationLocationSpecies } from '../lib/encounters';

type LocationCompletion = {
  caught: number;
  total: number;
  complete: boolean;
};

type GenerationCompletion = {
  generationKey: string;
  locations: Record<string, LocationCompletion>;
};

interface ChecklistModalProps {
  opened: boolean;
  groupedChecklist: GenerationLocationSpecies[];
  completionByGeneration: GenerationCompletion[];
  focusedGenerationKey?: string | null;
  onGenerationFocused: (generationKey: string) => void;
  onToggleCaught: (generationKey: string, species: string) => void;
  onResetChecklist: () => void;
  onClose: () => void;
  isCaught: (generationKey: string, species: string) => boolean;
}

function completionFor(
  completionByGeneration: GenerationCompletion[],
  generationKey: string,
  locationId: string
): LocationCompletion {
  const generation = completionByGeneration.find((item) => item.generationKey === generationKey);
  if (!generation) {
    return { caught: 0, total: 0, complete: true };
  }

  return generation.locations[locationId] ?? { caught: 0, total: 0, complete: true };
}

export function ChecklistModal({
  opened,
  groupedChecklist,
  completionByGeneration,
  focusedGenerationKey,
  onGenerationFocused,
  onToggleCaught,
  onResetChecklist,
  onClose,
  isCaught
}: ChecklistModalProps) {
  const [expandedGenerations, setExpandedGenerations] = useState<string[]>([]);
  const [highlightedGeneration, setHighlightedGeneration] = useState<string | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!opened) {
      return;
    }

    if (focusedGenerationKey && groupedChecklist.some((group) => group.generationKey === focusedGenerationKey)) {
      setExpandedGenerations([focusedGenerationKey]);
      return;
    }

    setExpandedGenerations([]);
  }, [focusedGenerationKey, groupedChecklist, opened]);

  useEffect(() => {
    if (!opened || !focusedGenerationKey) {
      setHighlightedGeneration(null);
      return;
    }

    setHighlightedGeneration(focusedGenerationKey);
    const timeoutId = window.setTimeout(() => {
      setHighlightedGeneration(null);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [focusedGenerationKey, opened]);

  useEffect(() => {
    if (!opened || !focusedGenerationKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const viewport = scrollViewportRef.current;
      if (!viewport) {
        return;
      }

      const target = viewport.querySelector<HTMLElement>(`[data-generation-key="${focusedGenerationKey}"]`);
      if (!target) {
        return;
      }

      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [focusedGenerationKey, opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="xl"
      title={
        <Group gap="xs" align="center">
          <ThemeIcon variant="light" color="violet" size="md">
            <IconChecklist size={14} />
          </ThemeIcon>
          <Text fw={700}>Catch Checklist</Text>
        </Group>
      }
    >
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap">
          <Stack gap={2}>
            <Text size="sm" c="dimmed">
              Grouped by generation and location. Checked species sync across all locations in the same generation.
            </Text>
            <Text size="xs" c="dimmed">
              Reset clears all checklist progress and saved generation positions.
            </Text>
          </Stack>
          <Button variant="light" color="red" leftSection={<IconRefresh size={14} />} onClick={onResetChecklist}>
            Reset checklist
          </Button>
        </Group>

        <ScrollArea h={480} viewportRef={scrollViewportRef}>
          {groupedChecklist.length === 0 && (
            <Text c="dimmed" size="sm">
              No checklist data available for this dataset.
            </Text>
          )}

          {groupedChecklist.length > 0 && (
            <Accordion
              variant="separated"
              radius="md"
              multiple
              value={expandedGenerations}
              onChange={setExpandedGenerations}
            >
              {groupedChecklist.map((generationGroup) => (
                <Accordion.Item
                  key={generationGroup.generationKey}
                  value={generationGroup.generationKey}
                  data-generation-key={generationGroup.generationKey}
                  style={
                    highlightedGeneration === generationGroup.generationKey
                      ? {
                          background: 'var(--accent-soft)',
                          outline: '1px solid var(--surface-panel-border)',
                          borderRadius: 8
                        }
                      : undefined
                  }
                >
                  <Accordion.Control onClick={() => onGenerationFocused(generationGroup.generationKey)}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text fw={600} size="sm">
                        {generationGroup.generationLabel}
                      </Text>
                      <Badge variant="light" color="indigo" size="sm">
                        {generationGroup.locations.length} locations
                      </Badge>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="sm">
                      {generationGroup.locations.map((location) => {
                        const completion = completionFor(completionByGeneration, generationGroup.generationKey, location.locationId);
                        const progress = completion.total === 0 ? 100 : Math.round((completion.caught / completion.total) * 100);

                        return (
                          <Stack key={`${generationGroup.generationKey}-${location.locationId}`} gap={6}>
                            <Group justify="space-between" wrap="wrap" gap="xs">
                              <Text fw={600} size="sm">
                                {location.locationName}
                              </Text>
                              <Badge color={completion.complete ? 'teal' : 'orange'} variant="light">
                                {completion.caught}/{completion.total}
                              </Badge>
                            </Group>
                            <Progress value={progress} size="sm" radius="xl" color={completion.complete ? 'teal' : 'violet'} />
                            <Group gap={10} wrap="wrap">
                              {location.species.map((species) => (
                                <Checkbox
                                  key={`${generationGroup.generationKey}-${location.locationId}-${species}`}
                                  label={species}
                                  checked={isCaught(generationGroup.generationKey, species)}
                                  onChange={() => onToggleCaught(generationGroup.generationKey, species)}
                                  size="xs"
                                />
                              ))}
                            </Group>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </ScrollArea>
      </Stack>
    </Modal>
  );
}
