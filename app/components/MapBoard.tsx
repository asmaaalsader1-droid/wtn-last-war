'use client';

import { Download, MousePointer2, MoveRight, Users } from 'lucide-react';
import { useState } from 'react';
import type { Assignment, Building, Player } from '@/app/types/domain';

function formatPower(power: number): string {
  if (power >= 1_000_000) return `${(power / 1_000_000).toFixed(power % 1_000_000 === 0 ? 0 : 1)}M`;
  if (power >= 1_000) return `${(power / 1_000).toFixed(power % 1_000 === 0 ? 0 : 1)}K`;
  return power.toLocaleString('en-US');
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r); ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
}

interface MapBoardProps {
  title: string;
  allianceName: string;
  players: Player[];
  buildings: Building[];
  assignments: Assignment[];
  selectedPlayerId: string | null;
  onPlayerClick: (playerId: string) => void;
  onBuildingClick: (buildingId: number) => void;
}

export function MapBoard({ title, allianceName, players, buildings, assignments, selectedPlayerId, onPlayerClick, onBuildingClick }: MapBoardProps) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const playersByBuilding = new Map<number, Player[]>();
  for (const assignment of assignments) {
    const player = playerMap.get(assignment.playerId);
    if (!player) continue;
    const group = playersByBuilding.get(assignment.buildingId) ?? [];
    group.push(player); playersByBuilding.set(assignment.buildingId, group);
  }

  async function exportImage() {
    setExporting(true); setExportError('');
    try {
      const image = new Image(); image.src = '/assets/war-map.png';
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('تعذر تحميل صورة الخريطة')); });
      const scale = 2; const mapWidth = image.naturalWidth * scale; const mapHeight = image.naturalHeight * scale; const headerHeight = allianceName.trim() ? 64 * scale : 0;
      const canvas = document.createElement('canvas'); canvas.width = mapWidth; canvas.height = mapHeight + headerHeight;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('تعذر إنشاء صورة التصدير');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, headerHeight, mapWidth, mapHeight);
      ctx.direction = 'rtl';
      if (allianceName.trim()) {
        const headerWidth = mapWidth * 0.42; const headerX = (mapWidth - headerWidth) / 2; const headerY = 10 * scale;
        ctx.fillStyle = 'rgba(255, 255, 255, .96)'; roundedRect(ctx, headerX, headerY, headerWidth, headerHeight - 20 * scale, 10 * scale); ctx.fill();
        ctx.strokeStyle = '#0d6f63'; ctx.lineWidth = 2 * scale; ctx.stroke(); ctx.fillStyle = '#0a0f10'; ctx.textAlign = 'center'; ctx.font = `bold ${17 * scale}px Arial`; ctx.fillText(allianceName.trim(), mapWidth / 2, headerY + 29 * scale);
      }
      ctx.textAlign = 'right';
      buildings.forEach((building) => {
        const group = playersByBuilding.get(building.id) ?? [];
        const x = mapWidth * (building.labelPosition.x / 100); const y = headerHeight + mapHeight * (building.labelPosition.y / 100); const boxWidth = mapWidth * (building.labelPosition.width / 100);
        const lines = group.length ? group.map((player) => `${player.name}  ·  ${formatPower(player.power)}`) : ['لا يوجد توزيع'];
        const shownLines = lines.slice(0, 5); if (lines.length > shownLines.length) shownLines.push(`+ ${lines.length - 5} لاعبين`);
        const boxHeight = (shownLines.length + 1) * 28 * scale + 20 * scale;
        ctx.fillStyle = building.enabled ? 'rgba(255, 255, 255, .94)' : 'rgba(247, 233, 232, .95)'; roundedRect(ctx, x, y, boxWidth, boxHeight, 12 * scale); ctx.fill();
        ctx.strokeStyle = building.enabled ? '#0d6f63' : '#b3261e'; ctx.lineWidth = 2 * scale; ctx.stroke(); ctx.fillStyle = building.enabled ? '#0d6f63' : '#b3261e'; ctx.font = `bold ${15 * scale}px Arial`; ctx.fillText(`${building.name}  ·  +${building.rate}/ث`, x + boxWidth - 14 * scale, y + 24 * scale);
        ctx.fillStyle = '#0a0f10'; ctx.font = `${13 * scale}px Arial`; shownLines.forEach((line, index) => ctx.fillText(line, x + boxWidth - 14 * scale, y + (49 + index * 27) * scale));
      });
      const link = document.createElement('a'); link.download = `${title.trim() || 'eqa-tactical-plan'}.png`; link.href = canvas.toDataURL('image/png'); link.click();
    } catch (error) { setExportError(error instanceof Error ? error.message : 'تعذر تصدير الخريطة.'); }
    finally { setExporting(false); }
  }

  return <section className="panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5"><div><span className="eyebrow">LIVE MAP / 11 NODES</span><h2 className="mt-1 text-lg font-black text-strong">المخطط البصري</h2></div><button className="btn-secondary" onClick={exportImage} disabled={exporting || !assignments.length}><Download size={16} />{exporting ? 'جار التصدير...' : 'تصدير PNG'}</button></div>{selectedPlayerId && <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2 text-xs font-bold text-brand"><MoveRight size={15} /> تم اختيار لاعب؛ انقر على أي مبنى لنقله إليه مباشرة.</div>}{exportError && <div className="mx-4 mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{exportError}</div>}<div className="p-3 sm:p-5"><div className="overflow-hidden rounded-2xl border border-line">{allianceName.trim() && <div className="border-b border-brand/40 bg-brand px-4 py-3 text-center text-sm font-black text-white">{allianceName}</div>}<div className="scanline map-frame relative aspect-square"><img src="/assets/war-map.png" alt="خريطة مباني الحرب" className="absolute inset-0 h-full w-full object-cover" />{buildings.map((building) => { const group = playersByBuilding.get(building.id) ?? []; return <div key={building.id} role="button" tabIndex={0} onClick={() => onBuildingClick(building.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onBuildingClick(building.id); }} className={`absolute cursor-pointer ${selectedPlayerId ? 'ring-1 ring-brand/20' : ''}`} style={{ left: `${building.labelPosition.x}%`, top: `${building.labelPosition.y}%`, width: `${building.labelPosition.width}%` }}><div className={`map-label rounded-lg border p-2 text-right ${building.enabled ? 'border-brand/60' : 'border-danger/60 opacity-70'}`}><div className="flex items-center justify-between gap-2 text-[11px] font-black text-brand sm:text-xs"><span>{building.name}</span><span>+{building.rate}/ث</span></div>{group.length === 0 ? <div className="mt-1 text-[10px] text-danger sm:text-xs">{building.enabled ? 'بانتظار التوزيع' : 'معطل'}</div> : <div className="mt-1 max-h-28 space-y-1 overflow-y-auto">{group.map((player) => <button key={player.id} onClick={(event) => { event.stopPropagation(); onPlayerClick(player.id); }} className={`block w-full truncate text-right text-[11px] font-bold text-strong sm:text-xs hover:text-brand ${selectedPlayerId === player.id ? 'rounded bg-brand px-1 text-white' : ''}`} title="اختر اللاعب ثم انقر مبنى الوجهة">{player.name} · {formatPower(player.power)}</button>)}</div>}</div></div>; })}</div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted"><span className="inline-flex items-center gap-2"><MousePointer2 size={14} className="text-brand" /> اختر اسم اللاعب ثم انقر على أي مبنى لنقله</span><span className="inline-flex items-center gap-2"><Users size={14} className="text-brand" /> {assignments.length} لاعباً موزعاً</span></div></div></section>;
}
