import { Edge, MarkerType, Node } from '@xyflow/react';
import type { LocationNodeData } from '../components/LocationNode';
import { LocationDataset } from '../types';
import { countUniquePokemon } from './encounters';

export type LocationFlowNode = Node<LocationNodeData, 'location'>;

export const NODE_WIDTH = 270;
export const NODE_HEIGHT = 104;

type Point = { x: number; y: number };
type Slot = { x: number; y: number };
type HandleSide = 'top' | 'right' | 'bottom' | 'left';

const DIRECTION_VECTORS: Record<string, Slot> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
  northeast: { x: 1, y: -1 },
  northwest: { x: -1, y: -1 },
  southeast: { x: 1, y: 1 },
  southwest: { x: -1, y: 1 }
};

const DIRECTION_PRIORITY: Record<string, number> = {
  north: 1,
  northeast: 2,
  east: 3,
  southeast: 4,
  south: 5,
  southwest: 6,
  west: 7,
  northwest: 8,
  contains: 20
};
const DIRECTION_HANDLE_SIDE: Record<string, HandleSide> = {
  north: 'top',
  northeast: 'top',
  northwest: 'top',
  south: 'bottom',
  southeast: 'bottom',
  southwest: 'bottom',
  east: 'right',
  west: 'left',
  contains: 'right'
};
const OPPOSITE_HANDLE_SIDE: Record<HandleSide, HandleSide> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right'
};

const SLOT_STEP_X = 360;
const SLOT_STEP_Y = 240;
const MAX_SLOT_SEARCH_RADIUS = 12;
const MAX_DEPTH_SPACING_DISTANCE = 3;
const POSITION_JITTER_X = 36;
const POSITION_JITTER_Y = 28;
const MIN_POSITION_JITTER_X = 14;
const MIN_POSITION_JITTER_Y = 10;
const CONTAINS_OFFSETS: Slot[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: -1 }
];

function normalizeDirection(value: string): string {
  return value.trim().toLowerCase();
}

function directionalHandleIds(direction: string): { sourceHandle: string; targetHandle: string } {
  const sourceSide = DIRECTION_HANDLE_SIDE[normalizeDirection(direction)] ?? 'right';
  const targetSide = OPPOSITE_HANDLE_SIDE[sourceSide];
  return {
    sourceHandle: `source-${sourceSide}`,
    targetHandle: `target-${targetSide}`
  };
}

function sortedConnections(location: LocationDataset['locations'][number]) {
  return [...location.connections].sort((left, right) => {
    const leftDir = normalizeDirection(left.dir);
    const rightDir = normalizeDirection(right.dir);
    const leftPriority = DIRECTION_PRIORITY[leftDir] ?? 12;
    const rightPriority = DIRECTION_PRIORITY[rightDir] ?? 12;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.to.localeCompare(right.to);
  });
}

function findStartLocationId(dataset: LocationDataset, preferredStartLocationId?: string): string {
  const ids = new Set(dataset.locations.map((location) => location.id));
  if (preferredStartLocationId && ids.has(preferredStartLocationId)) {
    return preferredStartLocationId;
  }

  const highestDegree = [...dataset.locations].sort((left, right) => right.connections.length - left.connections.length)[0];
  return highestDegree?.id ?? dataset.locations[0]?.id ?? '';
}

function slotKey(slot: Slot): string {
  return `${slot.x}:${slot.y}`;
}

function slotToPoint(slot: Slot): Point {
  return {
    x: slot.x * SLOT_STEP_X,
    y: slot.y * SLOT_STEP_Y
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let charIndex = 0; charIndex < value.length; charIndex += 1) {
    hash = (hash * 31 + value.charCodeAt(charIndex)) >>> 0;
  }
  return hash;
}

function deterministicOffset(value: string, minMagnitude: number, maxMagnitude: number): number {
  if (maxMagnitude <= 0) {
    return 0;
  }
  const clampedMinMagnitude = Math.max(0, Math.min(minMagnitude, maxMagnitude));
  const magnitudeRange = maxMagnitude - clampedMinMagnitude + 1;
  const hash = hashString(value);
  const signHash = hashString(`${value}:sign`);
  const magnitude = clampedMinMagnitude + (hash % magnitudeRange);
  const sign = (signHash & 1) !== 0 ? 1 : -1;
  return magnitude * sign;
}

function applyPointJitter(locationId: string, point: Point): Point {
  return {
    x: point.x + deterministicOffset(`x:${locationId}`, MIN_POSITION_JITTER_X, POSITION_JITTER_X),
    y: point.y + deterministicOffset(`y:${locationId}`, MIN_POSITION_JITTER_Y, POSITION_JITTER_Y)
  };
}

function findNearestFreeSlot(preferred: Slot, occupiedSlots: Set<string>): Slot {
  if (!occupiedSlots.has(slotKey(preferred))) {
    occupiedSlots.add(slotKey(preferred));
    return preferred;
  }

  for (let radius = 1; radius <= MAX_SLOT_SEARCH_RADIUS; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) {
          continue;
        }

        const candidate = {
          x: preferred.x + dx,
          y: preferred.y + dy
        };

        const key = slotKey(candidate);
        if (!occupiedSlots.has(key)) {
          occupiedSlots.add(key);
          return candidate;
        }
      }
    }
  }

  const fallback = {
    x: preferred.x + 13,
    y: preferred.y + 13
  };
  occupiedSlots.add(slotKey(fallback));
  return fallback;
}

function findFreeSlotAlongDirection(origin: Slot, vector: Slot, occupiedSlots: Set<string>, preferredDistance = 1): Slot {
  const boundedPreferredDistance = Math.max(1, Math.min(MAX_SLOT_SEARCH_RADIUS, preferredDistance));

  for (let distance = boundedPreferredDistance; distance <= MAX_SLOT_SEARCH_RADIUS; distance += 1) {
    const candidate = {
      x: origin.x + vector.x * distance,
      y: origin.y + vector.y * distance
    };
    const key = slotKey(candidate);
    if (!occupiedSlots.has(key)) {
      occupiedSlots.add(key);
      return candidate;
    }
  }

  for (let distance = 1; distance < boundedPreferredDistance; distance += 1) {
    const candidate = {
      x: origin.x + vector.x * distance,
      y: origin.y + vector.y * distance
    };
    const key = slotKey(candidate);
    if (!occupiedSlots.has(key)) {
      occupiedSlots.add(key);
      return candidate;
    }
  }

  return findNearestFreeSlot(
    {
      x: origin.x + vector.x * boundedPreferredDistance,
      y: origin.y + vector.y * boundedPreferredDistance
    },
    occupiedSlots
  );
}

function preferredDistanceForDepth(depth: number): number {
  return Math.min(MAX_DEPTH_SPACING_DISTANCE, Math.max(1, Math.ceil((depth + 1) / 2)));
}

function buildDirectionalPositions(dataset: LocationDataset, startLocationId: string): Map<string, Point> {
  const positions = new Map<string, Point>();
  const occupiedSlots = new Set<string>();
  const slotByLocationId = new Map<string, Slot>();
  const locationById = new Map(dataset.locations.map((location) => [location.id, location]));
  const traverseFrom = (seedId: string) => {
    const queue: Array<{ id: string; depth: number }> = [{ id: seedId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }
      const { id: currentId, depth: currentDepth } = current;

      const currentLocation = locationById.get(currentId);
      const currentSlot = slotByLocationId.get(currentId);
      if (!currentLocation || !currentSlot) {
        continue;
      }

      let containsIndex = 0;
      let fallbackIndex = 0;

      for (const connection of sortedConnections(currentLocation)) {
        const target = locationById.get(connection.to);
        if (!target || slotByLocationId.has(target.id)) {
          continue;
        }

        const direction = normalizeDirection(connection.dir);
        const vector = DIRECTION_VECTORS[direction];

        let freeSlot: Slot;
        if (direction === 'contains') {
          const ring = Math.floor(containsIndex / CONTAINS_OFFSETS.length) + 1;
          const baseOffset = CONTAINS_OFFSETS[containsIndex % CONTAINS_OFFSETS.length];
          containsIndex += 1;
          const candidateSlot = {
            x: currentSlot.x + baseOffset.x * ring,
            y: currentSlot.y + baseOffset.y * ring
          };
          freeSlot = findNearestFreeSlot(candidateSlot, occupiedSlots);
        } else if (vector) {
          freeSlot = findFreeSlotAlongDirection(
            currentSlot,
            vector,
            occupiedSlots,
            preferredDistanceForDepth(currentDepth)
          );
        } else {
          fallbackIndex += 1;
          const candidateSlot = {
            x: currentSlot.x + 1,
            y: currentSlot.y + fallbackIndex
          };
          freeSlot = findNearestFreeSlot(candidateSlot, occupiedSlots);
        }

        slotByLocationId.set(target.id, freeSlot);
        queue.push({ id: target.id, depth: currentDepth + 1 });
      }
    }
  };

  if (startLocationId && locationById.has(startLocationId)) {
    const startSlot = { x: 0, y: 0 };
    slotByLocationId.set(startLocationId, startSlot);
    occupiedSlots.add(slotKey(startSlot));
    traverseFrom(startLocationId);
  }

  const unplacedIds = () => dataset.locations.filter((location) => !slotByLocationId.has(location.id));

  let componentIndex = 0;
  while (unplacedIds().length > 0) {
    const nextSeed = unplacedIds().sort((left, right) => right.connections.length - left.connections.length)[0];
    if (!nextSeed) {
      break;
    }

    const row = Math.floor(componentIndex / 4);
    const col = componentIndex % 4;
    componentIndex += 1;

    const componentAnchor = {
      x: 6 + col * 4,
      y: -2 + row * 3
    };

    slotByLocationId.set(nextSeed.id, findNearestFreeSlot(componentAnchor, occupiedSlots));
    traverseFrom(nextSeed.id);
  }

  for (const location of dataset.locations) {
    const slot = slotByLocationId.get(location.id);
    if (!slot) {
      continue;
    }
    positions.set(location.id, slotToPoint(slot));
  }

  return positions;
}

function buildFallbackGridPositions(dataset: LocationDataset): Map<string, Point> {
  const positions = new Map<string, Point>();
  const columns = Math.max(6, Math.ceil(Math.sqrt(dataset.locations.length)));

  for (let index = 0; index < dataset.locations.length; index += 1) {
    const location = dataset.locations[index];
    const row = Math.floor(index / columns);
    const column = index % columns;

    positions.set(location.id, {
      x: column * SLOT_STEP_X,
      y: row * SLOT_STEP_Y
    });
  }

  return positions;
}

export function buildGraph(dataset: LocationDataset, preferredStartLocationId?: string): { nodes: LocationFlowNode[]; edges: Edge[] } {
  const startLocationId = findStartLocationId(dataset, preferredStartLocationId);
  let positions = buildDirectionalPositions(dataset, startLocationId);

  if (positions.size !== dataset.locations.length) {
    positions = buildFallbackGridPositions(dataset);
  }

  const nodes: LocationFlowNode[] = dataset.locations.map((location) => {
    const center = positions.get(location.id) ?? { x: 0, y: 0 };
    const jitteredCenter = applyPointJitter(location.id, center);
    const centerX = Number.isFinite(jitteredCenter.x) ? jitteredCenter.x : 0;
    const centerY = Number.isFinite(jitteredCenter.y) ? jitteredCenter.y : 0;
    return {
      id: location.id,
      type: 'location',
      position: {
        x: centerX - NODE_WIDTH / 2,
        y: centerY - NODE_HEIGHT / 2
      },
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
      edges.push({
        id: `edge-${edgeKey}`,
        source: location.id,
        target: connection.to,
        ...directionalHandleIds(connection.dir),
        label: connection.dir,
        markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22 },
        type: 'smoothstep',
        animated: connection.dir === 'contains',
        labelStyle: { fontSize: 11, fontWeight: 700 },
        style: { strokeWidth: 1.5 }
      });
    }
  }

  return { nodes, edges };
}
