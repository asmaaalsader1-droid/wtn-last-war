import { sortBuildingsByPriority, WAR_DURATION_SECONDS } from '@/app/lib/buildings';
import type { Assignment, Building, BuildingResult, DistributionResult, Player } from '@/app/types/domain';

function roundedScore(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A held building yields points for the seconds it is actually capturable: the
 * centre cannot be taken before its unlock minute, so it earns less than a
 * building that is open from the start.
 */
function productionSeconds(building: Building): number {
  return Math.max(0, WAR_DURATION_SECONDS - building.unlockMinute * 60);
}

function expectedPointsFor(building: Building, playerCount: number): number {
  if (!building.enabled || playerCount < 1) return 0;
  return building.rate * productionSeconds(building);
}

/**
 * Spreads players over buildings, weighting the plan towards points.
 *
 * Points decide the battle, so the highest-yield buildings are filled first.
 * Buildings that unlock at minute 10 are ranked below the ones open at the
 * start: with too few players to go around, nobody is parked on a building
 * that cannot be captured yet.
 *
 * - Fewer players than buildings: one player per building, strongest on the
 *   highest-yield building.
 * - At least as many players as buildings: an even share, so groups stay
 *   balanced instead of stacking everyone on a single building.
 */
export function distributePlayers(players: Player[], buildings: Building[]): DistributionResult {
  const usablePlayers = players.filter((player) => player.name.trim() && Number.isFinite(player.power) && player.power > 0);
  const orderedBuildings = sortBuildingsByPriority(buildings);
  const orderedPlayers = [...usablePlayers].sort((a, b) => b.power - a.power || a.name.localeCompare(b.name));

  const groups = new Map<number, Player[]>();
  orderedBuildings.forEach((building) => groups.set(building.id, []));

  if (orderedBuildings.length === 0) {
    return summarize(usablePlayers, buildings, groups, []);
  }

  if (orderedPlayers.length <= orderedBuildings.length) {
    // Scarce players: the strongest takes the highest-yield building.
    orderedPlayers.forEach((player, index) => groups.get(orderedBuildings[index].id)?.push(player));
  } else {
    // Plenty of players: deal round-robin in priority order. Because the queue
    // is sorted by power, each group ends up with a similar total.
    orderedPlayers.forEach((player, index) => {
      const building = orderedBuildings[index % orderedBuildings.length];
      groups.get(building.id)?.push(player);
    });
  }

  const assignments: Assignment[] = [];
  orderedBuildings.forEach((building) => {
    (groups.get(building.id) ?? []).forEach((player) => assignments.push({ playerId: player.id, buildingId: building.id }));
  });

  return summarize(usablePlayers, buildings, groups, assignments);
}

function summarize(usablePlayers: Player[], buildings: Building[], groups: Map<number, Player[]>, assignments: Assignment[]): DistributionResult {
  const results: BuildingResult[] = buildings.map((building) => {
    const assigned = groups.get(building.id) ?? [];
    const totalPower = assigned.reduce((sum, player) => sum + player.power, 0);
    return {
      ...building,
      players: assigned,
      totalPower,
      expectedPoints: expectedPointsFor(building, assigned.length),
      covered: assigned.length >= 1,
    };
  });

  const assignedPower = results.reduce((sum, building) => sum + building.totalPower, 0);
  const coveredPowers = results.filter((building) => building.covered).map((building) => building.totalPower);
  const averagePower = coveredPowers.length ? coveredPowers.reduce((sum, power) => sum + power, 0) / coveredPowers.length : 0;
  const averageDeviation = coveredPowers.length
    ? coveredPowers.reduce((sum, power) => sum + Math.abs(power - averagePower), 0) / coveredPowers.length
    : 0;

  return {
    assignments,
    buildings: results,
    totalPlayers: usablePlayers.length,
    assignedPlayers: assignments.length,
    uncoveredBuildingIds: results.filter((building) => building.enabled && !building.covered).map((building) => building.id),
    totalPower: usablePlayers.reduce((sum, player) => sum + player.power, 0),
    assignedPower,
    expectedPoints: results.reduce((sum, building) => sum + building.expectedPoints, 0),
    balanceScore: averagePower ? roundedScore(Math.max(0, 100 - (averageDeviation / averagePower) * 100)) : 0,
  };
}

export function applySwap(assignments: Assignment[], firstPlayerId: string, secondPlayerId: string): Assignment[] {
  if (firstPlayerId === secondPlayerId) return assignments;
  const first = assignments.find((item) => item.playerId === firstPlayerId);
  const second = assignments.find((item) => item.playerId === secondPlayerId);
  if (!first || !second) return assignments;
  return assignments.map((item) => {
    if (item.playerId === firstPlayerId) return { ...item, buildingId: second.buildingId };
    if (item.playerId === secondPlayerId) return { ...item, buildingId: first.buildingId };
    return item;
  });
}

export function resultsFromAssignments(players: Player[], buildings: Building[], assignments: Assignment[]): DistributionResult {
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const enabledBuildingIds = new Set(buildings.filter((building) => building.enabled).map((building) => building.id));
  const safeAssignments = assignments.filter((assignment) => enabledBuildingIds.has(assignment.buildingId));
  const result: BuildingResult[] = buildings.map((building) => {
    const buildingAssignments = safeAssignments.filter((assignment) => assignment.buildingId === building.id);
    const assignedPlayers = buildingAssignments.map((assignment) => playerMap.get(assignment.playerId)).filter((player): player is Player => Boolean(player));
    const totalPower = assignedPlayers.reduce((sum, player) => sum + player.power, 0);
    return { ...building, players: assignedPlayers, totalPower, expectedPoints: expectedPointsFor(building, assignedPlayers.length), covered: assignedPlayers.length >= 1 };
  });
  const coveredPowers = result.filter((building) => building.covered).map((building) => building.totalPower);
  const average = coveredPowers.length ? coveredPowers.reduce((sum, power) => sum + power, 0) / coveredPowers.length : 0;
  const deviation = coveredPowers.length ? coveredPowers.reduce((sum, power) => sum + Math.abs(power - average), 0) / coveredPowers.length : 0;
  return {
    assignments: safeAssignments,
    buildings: result,
    totalPlayers: players.length,
    assignedPlayers: safeAssignments.length,
    uncoveredBuildingIds: result.filter((building) => building.enabled && !building.covered).map((building) => building.id),
    totalPower: players.reduce((sum, player) => sum + player.power, 0),
    assignedPower: safeAssignments.reduce((sum, assignment) => sum + (playerMap.get(assignment.playerId)?.power ?? 0), 0),
    expectedPoints: result.reduce((sum, building) => sum + building.expectedPoints, 0),
    balanceScore: average ? roundedScore(Math.max(0, 100 - (deviation / average) * 100)) : 0,
  };
}
