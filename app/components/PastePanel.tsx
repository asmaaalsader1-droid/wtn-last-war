'use client';

import { AlertTriangle, ClipboardPaste, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { parsePlayerList, type ParsedPlayerLine } from '@/app/lib/playerParser';
import type { Player } from '@/app/types/domain';

interface PastePanelProps {
  existingNames: string[];
  onCancel: () => void;
  onConfirm: (players: Player[], mode: 'replace' | 'append') => void;
}

interface PreviewRow extends ParsedPlayerLine {
  key: string;
  duplicate: boolean;
}

const STATUS_LABEL: Record<ParsedPlayerLine['status'], string> = {
  ok: 'تم التعرف',
  'missing-power': 'بدون قوة',
  'no-name': 'بدون اسم',
};

export function PastePanel({ existingNames, onCancel, onConfirm }: PastePanelProps) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('append');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [skipped, setSkipped] = useState(0);

  const existingKey = useMemo(
    () => new Set(existingNames.map((name) => name.trim().toLocaleLowerCase())),
    [existingNames],
  );

  useEffect(() => {
    const parsed = parsePlayerList(text);
    const seen = new Set<string>();
    setRows(
      parsed.players.map((player, index) => {
        const key = player.name.trim().toLocaleLowerCase();
        const duplicate = Boolean(key) && (seen.has(key) || (mode === 'append' && existingKey.has(key)));
        if (key) seen.add(key);
        return { ...player, key: `${index}-${player.raw}`, duplicate };
      }),
    );
    setSkipped(parsed.skipped);
  }, [text, mode, existingKey]);

  const usableRows = rows.filter((row) => row.name.trim() && !row.duplicate && row.power > 0);
  const blocked = rows.some((row) => row.duplicate);
  const canConfirm = usableRows.length > 0 && !blocked;

  function updateRow(key: string, field: 'name' | 'power', value: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function confirm() {
    if (!canConfirm) return;
    const players: Player[] = usableRows.map((row, index) => ({
      id: `slot-paste-${Date.now()}-${index}`,
      name: row.name.trim(),
      power: row.power,
    }));
    onConfirm(players, mode);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-strong/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="لصق قائمة اللاعبين">
      <div className="panel flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand"><ClipboardPaste size={18} /></span>
            <div>
              <h2 className="text-base font-black text-strong">لصق قائمة اللاعبين</h2>
              <p className="text-xs text-muted">الصق الأسماء والقوى، وسيتم التعرف عليها تلقائياً.</p>
            </div>
          </div>
          <button className="btn-ghost" onClick={onCancel} aria-label="إغلاق"><X size={18} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <label className="block">
            <span className="label">الصق النص هنا (سطر لكل لاعب)</span>
            <textarea
              className="field min-h-32 resize-y font-mono text-xs"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={'أبو علي 50M\nمحمد, 30,000,000\n1. خالد - 15M\nسعيد 5k'}
              autoFocus
            />
          </label>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="inline-flex overflow-hidden rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setMode('append')}
                className={`px-3 py-2 font-bold ${mode === 'append' ? 'bg-brand text-white' : 'bg-panel2 text-label'}`}
              >
                الإضافة إلى القائمة
              </button>
              <button
                type="button"
                onClick={() => setMode('replace')}
                className={`px-3 py-2 font-bold ${mode === 'replace' ? 'bg-brand text-white' : 'bg-panel2 text-label'}`}
              >
                استبدال القائمة
              </button>
            </div>
            <span className="text-muted">تم التعرف على <strong className="text-brand">{rows.length}</strong> سطر</span>
            {skipped > 0 && <span className="text-muted">تم تجاهل <strong className="text-amber">{skipped}</strong></span>}
          </div>

          {rows.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-line">
              <div className="grid grid-cols-[1fr_130px_120px_44px] gap-2 border-b border-line bg-panel2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted">
                <span>الاسم</span><span>القوة</span><span>الحالة</span><span />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {rows.map((row) => (
                  <div key={row.key} className={`grid grid-cols-[1fr_130px_120px_44px] items-center gap-2 border-b border-line/60 px-3 py-2 last:border-b-0 ${row.duplicate ? 'bg-danger/10' : ''}`}>
                    <input
                      className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-strong outline-none focus:border-brand/50"
                      value={row.name}
                      onChange={(event) => updateRow(row.key, 'name', event.target.value)}
                      placeholder="اسم اللاعب"
                      aria-label="اسم اللاعب"
                    />
                    <input
                      className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm tabular-nums text-brand outline-none focus:border-brand/50"
                      inputMode="numeric"
                      value={row.power || ''}
                      onChange={(event) => updateRow(row.key, 'power', event.target.value)}
                      placeholder="القوة"
                      aria-label="قوة اللاعب"
                    />
                    <span className={`text-[11px] font-bold ${row.duplicate ? 'text-danger' : row.status === 'ok' ? 'text-brand' : 'text-amber'}`}>
                      {row.duplicate ? 'اسم مكرر' : STATUS_LABEL[row.status]}
                    </span>
                    <button className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger" onClick={() => removeRow(row.key)} aria-label="حذف السطر">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {blocked && (
            <div className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
              <AlertTriangle size={15} className="shrink-0 text-danger" />
              يوجد اسم مكرر. صحّحه أو احذف السطر قبل التأكيد.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <span className="text-xs text-muted">
            {usableRows.length > 0 ? <>سيتم إضافة <strong className="text-brand">{usableRows.length}</strong> لاعب بقوة أكبر من صفر</> : 'لا يوجد لاعبون صالحون بعد'}
          </span>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={onCancel}>إلغاء</button>
            <button className="btn-primary" onClick={confirm} disabled={!canConfirm}>تأكيد الإضافة</button>
          </div>
        </div>
      </div>
    </div>
  );
}
