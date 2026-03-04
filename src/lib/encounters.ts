import { Encounter, LocationModel } from '../types';
import { formatRegionName } from './format';

export type MethodGroup = { method: string; speciesCount: number; pokemonList: string[] };

type InstallmentDefinition = {
  id: string;
  generation: string;
  games: string[];
};

export type InstallmentGroup = {
  id: string;
  generation: string;
  games: string[];
  methods: MethodGroup[];
  note?: string;
  sortGeneration?: number;
  sortGame?: string;
};

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

export function countUniquePokemon(location: LocationModel): number {
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

export function buildInstallmentGroups(region: string, encounters: Encounter[]): InstallmentGroup[] {
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
