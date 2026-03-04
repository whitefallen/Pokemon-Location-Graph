import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  ActionIcon,
  AppShell,
  Badge,
  Card,
  Divider,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip
} from '@mantine/core';
import { IconArrowsMove, IconChartDots, IconRefresh, IconRoute } from '@tabler/icons-react';
import dagre from 'dagre';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Node,
  Edge,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useEdgesState,
  useNodesState
} from '@xyflow/react';
import { LocationNode, LocationNodeData } from './components/LocationNode';
import { Encounter, LocationDataset, LocationModel, ManifestDataset, ManifestFile } from './types';

const nodeTypes = {
  location: LocationNode
};

type LocationFlowNode = Node<LocationNodeData, 'location'>;
type DatasetWithRegion = ManifestDataset & { regionName: string };
type MethodGroup = { method: string; speciesCount: number; pokemonList: string[] };
type InstallmentDefinition = {
  id: string;
  generation: string;
  games: string[];
};

type InstallmentGroup = {
  id: string;
  generation: string;
  games: string[];
  methods: MethodGroup[];
  note?: string;
  sortGeneration?: number;
  sortGame?: string;
};

const NODE_WIDTH = 270;
const NODE_HEIGHT = 104;

const REGION_INSTALLMENTS: Record<string, InstallmentDefinition[]> = {
  kanto: [
    { id: 'gen1-rby', generation: 'Generation 1', games: ['Red', 'Blue', 'Yellow'] },
    { id: 'gen3-frlg', generation: 'Generation 3', games: ['FireRed', 'LeafGreen'] },
    { id: 'gen4-hgss', generation: 'Generation 4', games: ['HeartGold', 'SoulSilver'] }
  ],
  johto: [
    { id: 'gen2-gsc', generation: 'Generation 2', games: ['Gold', 'Silver', 'Crystal'] },
    { id: 'gen4-hgss', generation: 'Generation 4', games: ['HeartGold', 'SoulSilver'] }
  ],
  hoenn: [
    { id: 'gen3-rse', generation: 'Generation 3', games: ['Ruby', 'Sapphire', 'Emerald'] },
    {
      id: 'gen6-oras',
      generation: 'Generation 6',
      games: ['Omega Ruby', 'Alpha Sapphire']
    }
  ],
  sinnoh: [
    { id: 'gen4-dppt', generation: 'Generation 4', games: ['Diamond', 'Pearl', 'Platinum'] },
    { id: 'gen8-bdsp', generation: 'Generation 8', games: ['Brilliant Diamond', 'Shining Pearl'] }
  ],
  einall: [
    { id: 'gen5-bw', generation: 'Generation 5', games: ['Black', 'White'] },
    { id: 'gen5-b2w2', generation: 'Generation 5', games: ['Black 2', 'White 2'] }
  ],
  kalos: [{ id: 'gen6-xy', generation: 'Generation 6', games: ['X', 'Y'] }]
};

const VERSION_GROUP_DISPLAY: Record<string, { games: string[] }> = {
  'red-blue': { games: ['Red', 'Blue'] },
  yellow: { games: ['Yellow'] },
  'gold-silver': { games: ['Gold', 'Silver'] },
  crystal: { games: ['Crystal'] },
  'ruby-sapphire': { games: ['Ruby', 'Sapphire'] },
  emerald: { games: ['Emerald'] },
  'firered-leafgreen': { games: ['FireRed', 'LeafGreen'] },
  'diamond-pearl': { games: ['Diamond', 'Pearl'] },
  platinum: { games: ['Platinum'] },
  'heartgold-soulsilver': { games: ['HeartGold', 'SoulSilver'] },
  'black-white': { games: ['Black', 'White'] },
  'black-2-white-2': { games: ['Black 2', 'White 2'] },
  'x-y': { games: ['X', 'Y'] },
  'omega-ruby-alpha-sapphire': { games: ['Omega Ruby', 'Alpha Sapphire'] },
  'sun-moon': { games: ['Sun', 'Moon'] },
  'ultra-sun-ultra-moon': { games: ['Ultra Sun', 'Ultra Moon'] },
  'sword-shield': { games: ['Sword', 'Shield'] },
  'brilliant-diamond-shining-pearl': { games: ['Brilliant Diamond', 'Shining Pearl'] },
  'scarlet-violet': { games: ['Scarlet', 'Violet'] },
  'lets-go-pikachu-lets-go-eevee': { games: ["Let's Go Pikachu", "Let's Go Eevee"] },
  'legends-arceus': { games: ['Legends Arceus'] }
};

function formatRegionName(region: string): string {
  return region
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toRoman(value: number): string {
  const numerals = [
    ['M', 1000],
    ['CM', 900],
    ['D', 500],
    ['CD', 400],
    ['C', 100],
    ['XC', 90],
    ['L', 50],
    ['XL', 40],
    ['X', 10],
    ['IX', 9],
    ['V', 5],
    ['IV', 4],
    ['I', 1]
  ] as const;

  let remainder = value;
  let result = '';
  for (const [symbol, amount] of numerals) {
    while (remainder >= amount) {
      result += symbol;
      remainder -= amount;
    }
  }
  return result;
}

function generationLabelFromId(generationId?: number): string {
  if (!generationId || generationId < 1) {
    return 'Unknown generation';
  }
  return `Generation ${toRoman(generationId)}`;
}

function formatVersionGroupLabel(versionGroup: string): string {
  return versionGroup
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function gamesForVersionGroup(versionGroup: string): string[] {
  return VERSION_GROUP_DISPLAY[versionGroup]?.games ?? [formatVersionGroupLabel(versionGroup)];
}

function countUniquePokemon(location: LocationModel): number {
  return new Set(location.encounters.map((encounter) => encounter.pokemon)).size;
}

function summarizeMethods(encounters: Encounter[]): MethodGroup[] {
  const grouped = new Map<string, Set<string>>();
  for (const encounter of encounters) {
    const methodPokemon = grouped.get(encounter.method) ?? new Set<string>();
    methodPokemon.add(encounter.pokemon);
    grouped.set(encounter.method, methodPokemon);
  }
  return [...grouped.entries()]
    .map(([method, pokemonSet]) => ({
      method,
      speciesCount: pokemonSet.size,
      pokemonList: [...pokemonSet].sort((a, b) => a.localeCompare(b))
    }))
    .sort((a, b) => b.speciesCount - a.speciesCount);
}

function buildInstallmentGroups(region: string, encounters: Encounter[]): InstallmentGroup[] {
  const metadataEncounters = encounters.filter((encounter) => typeof encounter.versionGroup === 'string');

  if (metadataEncounters.length > 0) {
    const grouped = new Map<string, { encounters: Encounter[]; generation: string; games: string[]; generationOrder: number }>();
    const unmappedEncounters: Encounter[] = [];

    for (const encounter of encounters) {
      const versionGroup = encounter.versionGroup;
      if (!versionGroup) {
        unmappedEncounters.push(encounter);
        continue;
      }

      const generationOrder = encounter.generationId ?? Number.MAX_SAFE_INTEGER;
      const generation = encounter.generationName ?? generationLabelFromId(encounter.generationId);
      const key = `${generationOrder}|${generation}|${versionGroup}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          encounters: [],
          generation,
          games: gamesForVersionGroup(versionGroup),
          generationOrder
        });
      }

      grouped.get(key)!.encounters.push(encounter);
    }

    const groups: InstallmentGroup[] = [...grouped.entries()]
      .map(([key, value]) => {
        const [, , versionGroup] = key.split('|');
        return {
          id: `vg-${versionGroup}`,
          generation: value.generation,
          games: value.games,
          methods: summarizeMethods(value.encounters),
          sortGeneration: value.generationOrder,
          sortGame: versionGroup
        };
      })
      .sort((left, right) => {
        const byGeneration = (left.sortGeneration ?? Number.MAX_SAFE_INTEGER) - (right.sortGeneration ?? Number.MAX_SAFE_INTEGER);
        if (byGeneration !== 0) {
          return byGeneration;
        }
        return (left.sortGame ?? '').localeCompare(right.sortGame ?? '');
      });

    if (unmappedEncounters.length > 0) {
      groups.push({
        id: 'shared-source',
        generation: 'Shared source data',
        games: ['Unmapped game/version rows'],
        methods: summarizeMethods(unmappedEncounters)
      });
    }

    return groups;
  }

  const regionInstallments = REGION_INSTALLMENTS[region] ?? [
    { id: `${region}-default`, generation: 'Region', games: [formatRegionName(region)] }
  ];

  if (encounters.length === 0) {
    return regionInstallments.map((installment) => ({
      id: installment.id,
      generation: installment.generation,
      games: installment.games,
      methods: []
    }));
  }

  if (regionInstallments.length === 1) {
    return [
      {
        id: regionInstallments[0].id,
        generation: regionInstallments[0].generation,
        games: regionInstallments[0].games,
        methods: summarizeMethods(encounters)
      }
    ];
  }

  return [
    ...regionInstallments.map((installment) => ({
      id: installment.id,
      generation: installment.generation,
      games: installment.games,
      methods: [] as MethodGroup[],
      note: 'No game-specific encounter split is present in the current source data for this location.'
    })),
    {
      id: 'shared-source',
      generation: 'Shared source data',
      games: ['All mapped games (undifferentiated)'],
      methods: summarizeMethods(encounters)
    }
  ];
}

function buildGraph(dataset: LocationDataset): { nodes: LocationFlowNode[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 70, marginx: 40, marginy: 40 });

  const nodes: LocationFlowNode[] = dataset.locations.map((location) => {
    dagreGraph.setNode(location.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    return {
      id: location.id,
      type: 'location',
      position: { x: 0, y: 0 },
      data: {
        name: location.name,
        region: location.region,
        encounterCount: location.encounters.length,
        uniquePokemonCount: countUniquePokemon(location)
      }
    };
  });

  const seen = new Set<string>();
  const edges: Edge[] = [];
  for (const location of dataset.locations) {
    for (const connection of location.connections) {
      const edgeKey = `${location.id}::${connection.to}`;
      if (seen.has(edgeKey)) {
        continue;
      }
      seen.add(edgeKey);
      dagreGraph.setEdge(location.id, connection.to);
      edges.push({
        id: `edge-${edgeKey}`,
        source: location.id,
        target: connection.to,
        label: connection.dir,
        markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22 },
        type: 'smoothstep',
        animated: connection.dir === 'contains',
        labelStyle: { fontSize: 11, fontWeight: 700 },
        style: { strokeWidth: 1.5 }
      });
    }
  }

  dagre.layout(dagreGraph);

  for (const node of nodes) {
    const positioned = dagreGraph.node(node.id);
    node.position = {
      x: positioned.x - NODE_WIDTH / 2,
      y: positioned.y - NODE_HEIGHT / 2
    };
  }

  return { nodes, edges };
}

function GraphCanvas({
  selectedFile,
  datasets,
  onDatasetChange
}: {
  selectedFile: string;
  datasets: DatasetWithRegion[];
  onDatasetChange: (fileName: string) => void;
}) {
  const { fitView } = useReactFlow<LocationFlowNode, Edge>();
  const [nodes, setNodes, onNodesChange] = useNodesState<LocationFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [dataset, setDataset] = useState<LocationDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedLocationId(null);
        const response = await fetch(`/data/${selectedFile}`);
        if (!response.ok) {
          throw new Error(`Failed to load dataset: ${response.status} ${response.statusText}`);
        }
        const payload = (await response.json()) as LocationDataset;
        if (cancelled) {
          return;
        }
        const graph = buildGraph(payload);
        setDataset(payload);
        setNodes(graph.nodes);
        setEdges(graph.edges);

        requestAnimationFrame(() => {
          void fitView({ padding: 0.2, duration: 400, includeHiddenNodes: true });
        });
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unknown loading error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [fitView, selectedFile, setEdges, setNodes]);

  const selectedLocation = useMemo(() => {
    if (!dataset || !selectedLocationId) {
      return null;
    }
    return dataset.locations.find((location) => location.id === selectedLocationId) ?? null;
  }, [dataset, selectedLocationId]);

  const installmentGroups = useMemo(() => {
    if (!selectedLocation) {
      return [];
    }
    return buildInstallmentGroups(selectedLocation.region, selectedLocation.encounters);
  }, [selectedLocation]);

  return (
    <AppShell
      padding="md"
      header={{ height: 74 }}
      navbar={{ width: 360, breakpoint: 0 }}
      aside={{ width: 330, breakpoint: 0 }}
      h="100%"
      className="shell"
    >
      <AppShell.Header className="shell-header">
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <ThemeIcon size="lg" radius="md" variant="gradient" gradient={{ from: 'violet', to: 'blue' }}>
              <IconChartDots size={18} />
            </ThemeIcon>
            <div>
              <Title order={3}>Pokémon Location Graph</Title>
              <Text size="sm" c="dimmed">
                Interactive route and encounter network
              </Text>
            </div>
          </Group>
          <Tooltip label="Drag nodes, zoom, and inspect location details">
            <ActionIcon size="lg" variant="light" color="indigo" aria-label="graph interaction hint">
              <IconArrowsMove size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="md" h="100%">
          <Card className="glass" radius="lg" p="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fw={700}>Dataset</Text>
                <Badge variant="light" color="indigo">
                  encounters
                </Badge>
              </Group>
              <Select
                value={selectedFile}
                onChange={(value) => value && onDatasetChange(value)}
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
          </Card>

          <Card className="glass" radius="lg" p="md">
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
                <Badge color="violet">{nodes.length}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Connections
                </Text>
                <Badge color="blue">{edges.length}</Badge>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Generated
                </Text>
                <Text size="sm">{dataset?.generatedAt ? new Date(dataset.generatedAt).toLocaleDateString() : '-'}</Text>
              </Group>
            </Stack>
          </Card>
          <Text size="xs" c="dimmed" ta="center" mt="auto">
            Tip: click a node to inspect encounter methods.
          </Text>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main className="shell-main">
        <Paper radius="lg" p={0} h="100%" className="graph-paper">
          {loading && (
            <Group className="graph-overlay" justify="center" align="center">
              <Loader type="bars" color="violet" />
            </Group>
          )}
          {error && (
            <Group className="graph-overlay" justify="center" align="center">
              <Text c="red.4" fw={600}>
                {error}
              </Text>
            </Group>
          )}
          <div className="graph-flow">
            <ReactFlow<LocationFlowNode, Edge>
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_, node) => setSelectedLocationId(node.id)}
              nodeTypes={nodeTypes}
              minZoom={0.2}
              maxZoom={1.8}
              fitView
              attributionPosition="bottom-left"
              colorMode="dark"
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
              <MiniMap pannable zoomable className="minimap" />
              <Controls />
            </ReactFlow>
          </div>
        </Paper>
      </AppShell.Main>

      <AppShell.Aside p="md">
        <Card className="glass" radius="lg" p="md" h="100%">
          <Group justify="space-between" mb="sm">
            <Text fw={700}>Location Details</Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setSelectedLocationId(null)}
              aria-label="clear selection"
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Group>
          {!selectedLocation && (
            <Text c="dimmed" size="sm">
              Select a node to view encounter breakdown and connection details.
            </Text>
          )}
          {selectedLocation && (
            <Stack gap="sm">
              <Title order={4}>{selectedLocation.name}</Title>
              <Group gap="xs">
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
                Generations & games
              </Text>
              <ScrollArea h={280}>
                {selectedLocation.encounters.length === 0 && (
                  <Text c="dimmed" size="sm">
                    No encounter data for this location.
                  </Text>
                )}
                {selectedLocation.encounters.length > 0 && (
                  <Accordion variant="separated" radius="md" chevronPosition="right" multiple>
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
              <ScrollArea h={180}>
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
          )}
        </Card>
      </AppShell.Aside>
    </AppShell>
  );
}

function App() {
  const [datasets, setDatasets] = useState<DatasetWithRegion[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadManifest = async () => {
      const response = await fetch('/data/manifest.json');
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
      }
      const manifest = (await response.json()) as ManifestFile;
      const datasetsWithRegions = await Promise.all(
        manifest.datasets.map(async (dataset) => {
          try {
            const datasetResponse = await fetch(`/data/${dataset.fileName}`);
            if (!datasetResponse.ok) {
              return { ...dataset, regionName: dataset.label };
            }
            const datasetPayload = (await datasetResponse.json()) as LocationDataset;
            const primaryRegion = datasetPayload.locations[0]?.region ?? dataset.label;
            return { ...dataset, regionName: primaryRegion };
          } catch {
            return { ...dataset, regionName: dataset.label };
          }
        })
      );
      if (cancelled) {
        return;
      }
      setDatasets(datasetsWithRegions);
      setSelectedFile(datasetsWithRegions[0]?.fileName ?? null);
    };

    void loadManifest();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!selectedFile) {
    return (
      <Group h="100vh" justify="center" align="center">
        <Loader color="violet" />
      </Group>
    );
  }

  return (
    <Stack gap={0} h="100vh" className="app-root">
      <Card radius={0} py="xs" px="md" className="dataset-strip">
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            Loaded datasets: {datasets.length}
          </Text>
          <Select
            value={selectedFile}
            onChange={(value) => value && setSelectedFile(value)}
            w={340}
            searchable
            data={datasets.map((dataset) => ({
              value: dataset.fileName,
              label: `${formatRegionName(dataset.regionName)} • ${dataset.locations} loc • ${dataset.encounters} encounters`
            }))}
          />
        </Group>
      </Card>
      <div className="app-graph-shell">
        <ReactFlowProvider>
          <GraphCanvas
            selectedFile={selectedFile}
            datasets={datasets}
            onDatasetChange={(value) => setSelectedFile(value)}
          />
        </ReactFlowProvider>
      </div>
    </Stack>
  );
}

export default App;