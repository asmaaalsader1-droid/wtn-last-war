export type PlanStatus = 'draft' | 'ready';

export interface Player {
  id: string;
  name: string;
  power: number;
}

export interface Building {
  id: number;
  name: string;
  rate: number;
  enabled: boolean;
  /** Battle minute the building can be captured on. The centre unlocks at 10. */
  unlockMinute: number;
  mapPosition: { x: number; y: number };
  labelPosition: { x: number; y: number; width: number };
}

export interface Assignment {
  playerId: string;
  buildingId: number;
}

export interface BuildingResult extends Building {
  players: Player[];
  totalPower: number;
  expectedPoints: number;
  covered: boolean;
}

export interface PlanDraft {
  id?: string;
  title: string;
  allianceName: string;
  notes: string;
  warDurationSeconds: number;
  players: Player[];
  buildings: Building[];
  assignments: Assignment[];
  status: PlanStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface DistributionResult {
  assignments: Assignment[];
  buildings: BuildingResult[];
  totalPlayers: number;
  assignedPlayers: number;
  uncoveredBuildingIds: number[];
  totalPower: number;
  assignedPower: number;
  expectedPoints: number;
  balanceScore: number;
}
