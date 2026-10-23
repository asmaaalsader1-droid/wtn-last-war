import type { Building } from '@/app/types/domain';

/** The three centre buildings are locked until the 10th battle minute. */
export const CENTER_UNLOCK_MINUTE = 10;

/**
 * The eleven Desert Storm positions, numbered along the map border so the
 * sequence reads clockwise-free and predictably: start at the top-right corner
 * and descend the right side, run left across the bottom, climb the left side,
 * cross the top to the right, then finish on the centre column.
 *
 * The trailing code in each comment is the in-game position label (L/R side,
 * C centre) used by every Desert Storm map guide.
 *
 * `rate` is the alliance points per second the building yields while held.
 */
export const DEFAULT_BUILDINGS: Building[] = [
  { id: 1, name: 'مستشفى 1', rate: 30, enabled: true, unlockMinute: 0, mapPosition: { x: 73, y: 9 }, labelPosition: { x: 71, y: 4, width: 26 } }, // R1
  { id: 2, name: 'مستشفى 2', rate: 30, enabled: true, unlockMinute: 0, mapPosition: { x: 86, y: 34 }, labelPosition: { x: 71, y: 38, width: 27 } }, // R2
  { id: 3, name: 'مصفاة 3', rate: 50, enabled: true, unlockMinute: 0, mapPosition: { x: 84, y: 55 }, labelPosition: { x: 70, y: 57, width: 28 } }, // R3
  { id: 4, name: 'مركز العلوم 4', rate: 10, enabled: true, unlockMinute: 0, mapPosition: { x: 71, y: 78 }, labelPosition: { x: 68, y: 76, width: 30 } }, // R4
  { id: 5, name: 'مصنع المرتزقة 5', rate: 10, enabled: true, unlockMinute: CENTER_UNLOCK_MINUTE, mapPosition: { x: 50, y: 79 }, labelPosition: { x: 35, y: 83, width: 30 } }, // C3
  { id: 6, name: 'مستشفى 6', rate: 30, enabled: true, unlockMinute: 0, mapPosition: { x: 29, y: 78 }, labelPosition: { x: 3, y: 76, width: 30 } }, // L4
  { id: 7, name: 'مستشفى 7', rate: 30, enabled: true, unlockMinute: 0, mapPosition: { x: 16, y: 54 }, labelPosition: { x: 2, y: 57, width: 28 } }, // L3
  { id: 8, name: 'مصفاة 8', rate: 50, enabled: true, unlockMinute: 0, mapPosition: { x: 15, y: 34 }, labelPosition: { x: 2, y: 38, width: 27 } }, // L2
  { id: 9, name: 'مركز المعلومات 9', rate: 10, enabled: true, unlockMinute: 0, mapPosition: { x: 23, y: 8 }, labelPosition: { x: 3, y: 4, width: 25 } }, // L1
  { id: 10, name: 'ترسانة 10', rate: 10, enabled: true, unlockMinute: CENTER_UNLOCK_MINUTE, mapPosition: { x: 50, y: 25 }, labelPosition: { x: 34, y: 19, width: 32 } }, // C1
  { id: 11, name: 'صومعة نووية 11', rate: 80, enabled: true, unlockMinute: CENTER_UNLOCK_MINUTE, mapPosition: { x: 50, y: 47 }, labelPosition: { x: 31, y: 48, width: 38 } }, // C2
];

export const WAR_DURATION_SECONDS = 30 * 60;

export function cloneDefaultBuildings(): Building[] {
  return DEFAULT_BUILDINGS.map((building) => ({
    ...building,
    mapPosition: { ...building.mapPosition },
    labelPosition: { ...building.labelPosition },
  }));
}

/** Buildings available from the opening whistle. */
export function isAvailableAtStart(building: Building): boolean {
  return building.unlockMinute <= 0;
}

/**
 * Capture order when players are scarce: open buildings first, then the locked
 * centre. Within each group the highest yield wins, because points decide the
 * battle and a high-rate building repays the player parked on it.
 */
export function sortBuildingsByPriority(buildings: Building[]): Building[] {
  return buildings
    .filter((building) => building.enabled)
    .sort((a, b) => Number(isAvailableAtStart(b)) - Number(isAvailableAtStart(a)) || b.rate - a.rate || a.id - b.id);
}
