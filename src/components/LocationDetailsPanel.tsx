import {
  Accordion,
  ActionIcon,
  Badge,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
  Transition
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { LocationModel } from '../types';
import { countUniquePokemon, InstallmentGroup } from '../lib/encounters';

type ChecklistGenerationCompletion = {
  generationKey: string;
  generationLabel: string;
  caught: number;
  total: number;
  complete: boolean;
};

interface LocationDetailsPanelProps {
  selectedLocation: LocationModel | null;
  installmentGroups: InstallmentGroup[];
  checklistCompletion: ChecklistGenerationCompletion[];
  onOpenChecklistGeneration: (generationKey: string) => void;
  onClear: () => void;
  encounterScrollHeight: number;
  connectionsScrollHeight: number;
}

export function LocationDetailsPanel({
  selectedLocation,
  installmentGroups,
  checklistCompletion,
  onOpenChecklistGeneration,
  onClear,
  encounterScrollHeight,
  connectionsScrollHeight
}: LocationDetailsPanelProps) {
  return (
    <>
      <Group justify="space-between" mb="sm" className="location-details-header">
        <Text fw={700}>Location Details</Text>
        <ActionIcon className="touch-target" variant="subtle" color="gray" onClick={onClear} aria-label="clear selection">
          <IconRefresh size={16} />
        </ActionIcon>
      </Group>
      {!selectedLocation && (
        <Text c="dimmed" size="sm">
          Select a node to view encounter breakdown and connection details.
        </Text>
      )}
      <Transition mounted={Boolean(selectedLocation)} transition="fade-up" duration={180} timingFunction="ease">
        {(styles) =>
          selectedLocation ? (
            <Stack gap="sm" style={styles} className="location-details-stack">
              <Title order={4}>{selectedLocation.name}</Title>
              <Group gap="xs" className="location-badges" wrap="wrap">
                <Badge color="indigo" variant="light" tt="capitalize">
                  {selectedLocation.region}
                </Badge>
                <Badge color="teal" variant="light">
                  {selectedLocation.encounters.length} encounters
                </Badge>
                <Badge color="grape" variant="light">
                  {countUniquePokemon(selectedLocation)} species
                </Badge>
              </Group>

              <Divider my={4} />
              <Text size="sm" fw={600}>
                Checklist progress
              </Text>
              {checklistCompletion.length === 0 && (
                <Text c="dimmed" size="sm">
                  No generation checklist entries for this location.
                </Text>
              )}
              {checklistCompletion.length > 0 && (
                <Group gap={6} wrap="wrap">
                  {checklistCompletion.map((entry) => (
                    <Badge
                      key={`${selectedLocation.id}-${entry.generationKey}`}
                      color={entry.complete ? 'teal' : 'orange'}
                      variant="light"
                      style={{ cursor: 'pointer' }}
                      onClick={() => onOpenChecklistGeneration(entry.generationKey)}
                    >
                      {entry.generationLabel}: {entry.caught}/{entry.total}
                    </Badge>
                  ))}
                </Group>
              )}

              <Divider my={4} />
              <Text size="sm" fw={600}>
                Generations & games
              </Text>
              <ScrollArea h={encounterScrollHeight}>
                {selectedLocation.encounters.length === 0 && (
                  <Text c="dimmed" size="sm">
                    No encounter data for this location.
                  </Text>
                )}
                {selectedLocation.encounters.length > 0 && (
                  <Accordion className="details-accordion" variant="separated" radius="md" chevronPosition="right" multiple>
                    {installmentGroups.map((group) => (
                      <Accordion.Item key={group.id} value={group.id}>
                        <Accordion.Control>
                          <Stack gap={2}>
                            <Text fw={600} size="sm">
                              {group.generation}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {group.games.join(' • ')}
                            </Text>
                          </Stack>
                        </Accordion.Control>
                        <Accordion.Panel>
                          {group.note && (
                            <Text size="xs" c="yellow.3" mb="xs">
                              {group.note}
                            </Text>
                          )}
                          {group.methods.length === 0 && (
                            <Text c="dimmed" size="sm">
                              No encounters mapped to this installment.
                            </Text>
                          )}
                          {group.methods.length > 0 && (
                            <Stack gap={8}>
                              {group.methods.map((methodGroup) => (
                                <Stack key={`${group.id}-${methodGroup.method}`} gap={4}>
                                  <Group justify="space-between">
                                    <Badge variant="dot" color="blue">
                                      {methodGroup.method}
                                    </Badge>
                                    <Text size="sm">{methodGroup.speciesCount} species</Text>
                                  </Group>
                                  <Group gap={6} wrap="wrap">
                                    {methodGroup.pokemonList.map((pokemon) => (
                                      <Badge
                                        key={`${group.id}-${methodGroup.method}-${pokemon}`}
                                        color="grape"
                                        variant="light"
                                        size="xs"
                                      >
                                        {pokemon}
                                      </Badge>
                                    ))}
                                  </Group>
                                </Stack>
                              ))}
                            </Stack>
                          )}
                        </Accordion.Panel>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                )}
              </ScrollArea>

              <Text size="sm" fw={600} mt={4}>
                Outgoing connections
              </Text>
              <ScrollArea h={connectionsScrollHeight}>
                <Stack gap={6}>
                  {selectedLocation.connections.length === 0 && (
                    <Text c="dimmed" size="sm">
                      No outgoing connections.
                    </Text>
                  )}
                  {selectedLocation.connections.map((connection) => (
                    <Group key={`${selectedLocation.id}-${connection.to}-${connection.dir}`} justify="space-between">
                      <Text size="sm">{connection.to}</Text>
                      <Badge color="gray" variant="light">
                        {connection.dir}
                      </Badge>
                    </Group>
                  ))}
                </Stack>
              </ScrollArea>
            </Stack>
          ) : (
            <div />
          )
        }
      </Transition>
    </>
  );
}
