export interface ManifestFile {
  datasets: ManifestDataset[];
}

export interface ManifestDataset {
  fileName: string;
  label: string;
  locations: number;
  encounters: number;
}

export interface Encounter {
  method: string;
  pokemon: string;
  versionGroup?: string;
  generationId?: number;
  generationName?: string;
}

export interface LocationConnection {
  to: string;
  dir: string;
}

export interface LocationModel {
  id: string;
  name: string;
  region: string;
  connections: LocationConnection[];
  encounters: Encounter[];
}

export interface LocationDataset {
  source: string;
  generatedAt: string;
  locations: LocationModel[];
}