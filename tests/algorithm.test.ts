import { describe, expect, it } from 'vitest';
import { applySwap, distributePlayers, resultsFromAssignments } from '@/app/lib/algorithm';
import { cloneDefaultBuildings, isAvailableAtStart } from '@/app/lib/buildings';
import type { Player } from '@/app/types/domain';

function players(count: number, power = 30_000_000): Player[] {
  return Array.from({ length: count }, (_, index) => ({ id: `p-${index + 1}`, name: `Player ${index + 1}`, power: power - index * 100_000 }));
}

describe('EQA Tactical distribution', () => {
  it('gives every player their own building when players are scarce', () => {
    // Regression: three players used to be stacked on the single highest-rate
    // building and everything else stayed empty.
    const result = distributePlayers(players(3), cloneDefaultBuildings());
    expect(result.assignedPlayers).toBe(3);
    expect(result.buildings.filter((building) => building.covered)).toHaveLength(3);
    const counts = result.buildings.map((building) => building.players.length);
    expect(Math.max(...counts)).toBe(1);
  });

  it('never parks a scarce player on a building that opens at minute 10', () => {
    const buildings = cloneDefaultBuildings();
    const result = distributePlayers(players(3), buildings);
    const locked = buildings.filter((building) => !isAvailableAtStart(building)).map((building) => building.id);
    const used = result.assignments.map((assignment) => assignment.buildingId);
    expect(used.some((id) => locked.includes(id))).toBe(false);
  });

  it('puts the strongest player on the highest-yield open building', () => {
    const result = distributePlayers(players(3), cloneDefaultBuildings());
    const strongest = result.assignments.find((assignment) => assignment.playerId === 'p-1');
    // Building 6 is the richest but locked, so building 4 (50/s) wins.
    expect(strongest?.buildingId).toBe(4);
  });

  it('spreads players evenly once every building can take one', () => {
    const result = distributePlayers(players(22), cloneDefaultBuildings());
    const counts = result.buildings.map((building) => building.players.length);
    expect(result.assignedPlayers).toBe(22);
    expect(Math.max(...counts) - Math.min(...counts)).toBe(0);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(22);
  });

  it('keeps a single leftover player off an already balanced map', () => {
    const result = distributePlayers(players(12), cloneDefaultBuildings());
    const counts = result.buildings.map((building) => building.players.length);
    expect(counts.filter((count) => count === 2)).toHaveLength(1);
    expect(counts.filter((count) => count === 1)).toHaveLength(10);
  });

  it('awards points for a single player holding a building', () => {
    const buildings = cloneDefaultBuildings().slice(0, 1);
    const result = distributePlayers(players(1), buildings);
    expect(result.buildings[0].covered).toBe(true);
    expect(result.expectedPoints).toBe(buildings[0].rate * 1800);
  });

  it('discounts the minutes a building is still locked', () => {
    const locked = cloneDefaultBuildings().filter((building) => building.id === 6);
    const result = distributePlayers(players(2), locked);
    expect(result.expectedPoints).toBe(locked[0].rate * (1800 - 10 * 60));
  });

  it('never assigns a disabled building', () => {
    const buildings = cloneDefaultBuildings().map((building) => building.id === 4 ? { ...building, enabled: false } : building);
    const result = distributePlayers(players(20), buildings);
    expect(result.assignments.some((assignment) => assignment.buildingId === 4)).toBe(false);
    expect(result.buildings.find((building) => building.id === 4)?.players).toHaveLength(0);
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
    expect(result.buildings.every((building) => building.players.some((player) => player.power === 50_000_000) && building.players.some((player) => player.power === 30_000_000))).toBe(true);
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
