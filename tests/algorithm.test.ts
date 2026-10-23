import { describe, expect, it } from 'vitest';
import { applySwap, distributePlayers, resultsFromAssignments } from '@/app/lib/algorithm';
import { cloneDefaultBuildings } from '@/app/lib/buildings';
import type { Player } from '@/app/types/domain';

function players(count: number, power = 30_000_000): Player[] {
  return Array.from({ length: count }, (_, index) => ({ id: `p-${index + 1}`, name: `Player ${index + 1}`, power: power - index * 100_000 }));
}

describe('EQA Tactical distribution', () => {
  it('covers only buildings that can receive two players', () => {
    const buildings = cloneDefaultBuildings();
    const result = distributePlayers(players(5), buildings);
    expect(result.assignedPlayers).toBe(5);
    expect(result.uncoveredBuildingIds.length).toBe(9);
    expect(result.buildings.filter((building) => building.covered)).toHaveLength(2);
  });

  it('never assigns a disabled building', () => {
    const buildings = cloneDefaultBuildings().map((building) => building.id === 6 ? { ...building, enabled: false } : building);
    const result = distributePlayers(players(20), buildings);
    expect(result.assignments.some((assignment) => assignment.buildingId === 6)).toBe(false);
    expect(result.buildings.find((building) => building.id === 6)?.players).toHaveLength(0);
  });

  it('keeps the same input deterministic', () => {
    const buildings = cloneDefaultBuildings();
    const first = distributePlayers(players(20), buildings);
    const second = distributePlayers(players(20), buildings);
    expect(second.assignments).toEqual(first.assignments);
    expect(second.expectedPoints).toBe(first.expectedPoints);
  });

  it('mixes high and lower powers in covered groups', () => {
    const buildings = cloneDefaultBuildings().slice(0, 2);
    const mixed = [
      { id: 'strong-1', name: 'Strong 1', power: 50_000_000 },
      { id: 'strong-2', name: 'Strong 2', power: 50_000_000 },
      { id: 'weak-1', name: 'Weak 1', power: 30_000_000 },
      { id: 'weak-2', name: 'Weak 2', power: 30_000_000 },
    ];
    const result = distributePlayers(mixed, buildings);
    expect(result.buildings.filter((building) => building.covered).every((building) => building.players.some((player) => player.power === 50_000_000) && building.players.some((player) => player.power === 30_000_000))).toBe(true);
  });

  it('recalculates points for 30 minutes only after two players cover a building', () => {
    const buildings = cloneDefaultBuildings().slice(0, 1);
    const two = players(2);
    const result = distributePlayers(two, buildings);
    expect(result.expectedPoints).toBe(buildings[0].rate * 1800);
    expect(result.buildings[0].covered).toBe(true);
  });

  it('swaps only the selected players building assignments', () => {
    const assignments = [{ playerId: 'a', buildingId: 1 }, { playerId: 'b', buildingId: 2 }, { playerId: 'c', buildingId: 2 }];
    expect(applySwap(assignments, 'a', 'b')).toEqual([{ playerId: 'a', buildingId: 2 }, { playerId: 'b', buildingId: 1 }, { playerId: 'c', buildingId: 2 }]);
    const recalculated = resultsFromAssignments(players(3), cloneDefaultBuildings(), assignments);
    expect(recalculated.assignedPlayers).toBe(3);
  });

  it('ignores stale assignments for a disabled building', () => {
    const buildings = cloneDefaultBuildings().map((building) => building.id === 1 ? { ...building, enabled: false } : building);
    const result = resultsFromAssignments(players(2), buildings, [{ playerId: 'p-1', buildingId: 1 }, { playerId: 'p-2', buildingId: 1 }]);
    expect(result.assignedPlayers).toBe(0);
    expect(result.buildings.find((building) => building.id === 1)?.players).toHaveLength(0);
  });
});
