import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildGenerationLocationSpecies, GenerationLocationSpecies } from '../lib/encounters';
import { LocationDataset } from '../types';

const STORAGE_KEY = 'pokemon-location-graph:caught-checklist:v1';

type ChecklistStorage = Record<string, string[]>;

type LocationCompletion = {
  caught: number;
  total: number;
  complete: boolean;
};

type GenerationCompletion = {
  generationKey: string;
  locations: Record<string, LocationCompletion>;
};

function normalizeSpecies(value: string): string {
  return value.trim().toLowerCase();
}

function toCaughtKey(generationKey: string, species: string): string {
  return `${generationKey}::${normalizeSpecies(species)}`;
}

function readStorage(): ChecklistStorage {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as ChecklistStorage;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

function writeStorage(storage: ChecklistStorage): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (Object.keys(storage).length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

function clearStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

function upsertDatasetStorage(datasetFile: string, keys: Set<string>): void {
  const storage = readStorage();

  if (keys.size === 0) {
    delete storage[datasetFile];
  } else {
    storage[datasetFile] = [...keys].sort((left, right) => left.localeCompare(right));
  }

  writeStorage(storage);
}

export function useCaughtChecklist(datasetFile: string, dataset: LocationDataset | null) {
  const [caughtKeys, setCaughtKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const storage = readStorage();
    const keys = storage[datasetFile] ?? [];
    setCaughtKeys(new Set(keys));
  }, [datasetFile]);

  const groupedChecklist = useMemo<GenerationLocationSpecies[]>(() => {
    if (!dataset) {
      return [];
    }
    return buildGenerationLocationSpecies(dataset);
  }, [dataset]);

  const isCaught = useCallback(
    (generationKey: string, species: string) => {
      return caughtKeys.has(toCaughtKey(generationKey, species));
    },
    [caughtKeys]
  );

  const toggleCaught = useCallback(
    (generationKey: string, species: string) => {
      setCaughtKeys((current) => {
        const next = new Set(current);
        const key = toCaughtKey(generationKey, species);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }

        upsertDatasetStorage(datasetFile, next);
        return next;
      });
    },
    [datasetFile]
  );

  const resetChecklist = useCallback(() => {
    setCaughtKeys(new Set());
    clearStorage();
  }, []);

  const completionByGeneration = useMemo<GenerationCompletion[]>(() => {
    return groupedChecklist.map((generationGroup) => {
      const locations: Record<string, LocationCompletion> = {};

      for (const location of generationGroup.locations) {
        const total = location.species.length;
        const caught = location.species.reduce((sum, pokemon) => {
          return sum + (caughtKeys.has(toCaughtKey(generationGroup.generationKey, pokemon)) ? 1 : 0);
        }, 0);

        locations[location.locationId] = {
          caught,
          total,
          complete: total === 0 ? true : caught >= total
        };
      }

      return {
        generationKey: generationGroup.generationKey,
        locations
      };
    });
  }, [caughtKeys, groupedChecklist]);

  const incompleteLocations = useMemo(() => {
    const summary: { generationKey: string; locationId: string }[] = [];

    for (const generation of completionByGeneration) {
      for (const [locationId, completion] of Object.entries(generation.locations)) {
        if (completion.total > 0 && !completion.complete) {
          summary.push({ generationKey: generation.generationKey, locationId });
        }
      }
    }

    return summary;
  }, [completionByGeneration]);

  return {
    groupedChecklist,
    completionByGeneration,
    incompleteLocations,
    isCaught,
    toggleCaught,
    resetChecklist
  };
}
