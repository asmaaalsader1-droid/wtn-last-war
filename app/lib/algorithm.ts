import { sortBuildingsByImportance } from '@/app/lib/buildings';
import type { Assignment, Building, BuildingResult, DistributionResult, Player } from '@/app/types/domain';

const WAR_SECONDS = 30 * 60;

function roundedScore(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Assigns strong players first to the currently weakest eligible group, then
 * sends surplus players to the most valuable buildings. This is deterministic:
 * the same input always produces the same plan.
 */
export function distributePlayers(players: Player[], buildings: Building[]): DistributionResult {
  const usablePlayers = players.filter((player) => player.name.trim() && Number.isFinite(player.power) && player.power > 0);
  const orderedBuildings = sortBuildingsByImportance(buildings);
  const coveredCount = Math.min(orderedBuildings.length, Math.floor(usablePlayers.length / 2));
  const coveredBuildings = orderedBuildings.slice(0, coveredCount);
  const groups = new Map<number, Player[]>();
  coveredBuildings.forEach((building) => groups.set(building.id, []));

  const orderedPlayers = [...usablePlayers].sort((a, b) => b.power - a.power || a.name.localeCompare(b.name));

  // The first pass guarantees two players per covered building. Because the
  // next player joins the weakest group, strong and weak powers are mixed.
  for (const player of orderedPlayers) {
    const incomplete = coveredBuildings.filter((building) => (groups.get(building.id)?.length ?? 0) < 2);
    if (incomplete.length > 0) {
      const target = incomplete.reduce((best, candidate) => {
        const bestPower = (groups.get(best.id) ?? []).reduce((sum, item) => sum + item.power, 0);
        const candidatePower = (groups.get(candidate.id) ?? []).reduce((sum, item) => sum + item.power, 0);
        return candidatePower < bestPower ? candidate : best;
      }, incomplete[0]);
      groups.get(target.id)?.push(player);
      continue;
    }

    // Surplus players reinforce the highest-value buildings first.
    const reinforcementTarget = coveredBuildings
      .slice()
      .sort((a, b) => a.rate - b.rate || a.id - b.id)[0];
    if (reinforcementTarget) {
      const target = coveredBuildings.find((building) => building.id === reinforcementTarget.id);
      if (target) {
        const weakestImportant = coveredBuildings.reduce((best, candidate) => {
          const bestGroup = groups.get(best.id) ?? [];
          const candidateGroup = groups.get(candidate.id) ?? [];
          if (candidate.rate > best.rate) return candidate;
          if (candidate.rate < best.rate) return best;
          return candidateGroup.reduce((sum, item) => sum + item.power, 0) < bestGroup.reduce((sum, item) => sum + item.power, 0) ? candidate : best;
        }, coveredBuildings[0]);
        groups.get(weakestImportant.id)?.push(player);
      }
    }
  }

  const assignments: Assignment[] = [];
  const results: BuildingResult[] = buildings.map((building) => {
    const assigned = groups.get(building.id) ?? [];
    assigned.forEach((player) => assignments.push({ playerId: player.id, buildingId: building.id }));
    const totalPower = assigned.reduce((sum, player) => sum + player.power, 0);
    return {
      ...building,
      players: assigned,
      totalPower,
      expectedPoints: building.enabled && assigned.length >= 2 ? building.rate * WAR_SECONDS : 0,
      covered: assigned.length >= 2,
    };
  });

  const assignedPower = results.reduce((sum, building) => sum + building.totalPower, 0);
  const powers = results.filter((building) => building.covered).map((building) => building.totalPower);
  const averagePower = powers.length ? powers.reduce((sum, power) => sum + power, 0) / powers.length : 0;
  const averageDeviation = powers.length
    ? powers.reduce((sum, power) => sum + Math.abs(power - averagePower), 0) / powers.length
    : 0;
  const balanceScore = averagePower ? roundedScore(Math.max(0, 100 - (averageDeviation / averagePower) * 100)) : 0;

  return {
    assignments,
    buildings: results,
    totalPlayers: usablePlayers.length,
    assignedPlayers: assignments.length,
    uncoveredBuildingIds: results.filter((building) => building.enabled && !building.covered).map((building) => building.id),
    totalPower: usablePlayers.reduce((sum, player) => sum + player.power, 0),
    assignedPower,
    expectedPoints: results.reduce((sum, building) => sum + building.expectedPoints, 0),
    balanceScore,
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
    return { ...building, players: assignedPlayers, totalPower, expectedPoints: building.enabled && assignedPlayers.length >= 2 ? building.rate * WAR_SECONDS : 0, covered: assignedPlayers.length >= 2 };
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
