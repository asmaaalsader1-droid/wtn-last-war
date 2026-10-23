'use client';

import { AlertTriangle, ArrowLeft, Check, ClipboardPaste, Clock, Copy, FileText, Loader2, Minus, MoveRight, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/app/components/AppShell';
import { ErrorMessage, SetupNotice, SuccessMessage } from '@/app/components/StatusMessage';
import { MapBoard } from '@/app/components/MapBoard';
import { PastePanel } from '@/app/components/PastePanel';
import { applySwap, distributePlayers, resultsFromAssignments } from '@/app/lib/algorithm';
import { cloneDefaultBuildings } from '@/app/lib/buildings';
import { translateAuthError } from '@/app/lib/errorMessages';
import { formatPlayersForExport } from '@/app/lib/playerParser';
import { isSupabaseConfigured, loadPlan, savePlan, supabase } from '@/app/lib/supabase';
import type { Assignment, Building, PlanDraft, Player } from '@/app/types/domain';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let blankSlotCounter = 0;
function isBlankPlayer(player: Player): boolean { return !player.name.trim() && player.power <= 0; }
// Blank rows are a pool, not something the user sees all of. Only the trailing
// blank is rendered, so a fresh row appears as soon as the current one is filled.
function makeBlankPlayer(): Player { blankSlotCounter += 1; return { id: `blank-${blankSlotCounter}`, name: '', power: 0 }; }
function ensureTrailingBlank(list: Player[]): Player[] {
  return list.length && isBlankPlayer(list[list.length - 1]) ? list : [...list, makeBlankPlayer()];
}
function formatPower(power: number): string { return power >= 1_000_000 ? `${(power / 1_000_000).toFixed(1)}M` : power.toLocaleString('en-US'); }
function normalizePower(value: string): number { return Number(value.replace(/,/g, '').replace(/\s/g, '')) || 0; }

export function PlanEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlanId = searchParams.get('id');
  const [title, setTitle] = useState('خطة  جديدة');
  const [allianceName, setAllianceName] = useState('');
  const [notes, setNotes] = useState('');
  const [players, setPlayers] = useState<Player[]>(() => [makeBlankPlayer()]);
  const [buildings, setBuildings] = useState<Building[]>(() => cloneDefaultBuildings());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(requestedPlanId));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);

  // Warn before leaving with unsaved edits; the ref keeps the listener current.
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user && isSupabaseConfigured) router.replace('/login');
      setUserId(data.user?.id ?? null);
      if (requestedPlanId && data.user) {
        void loadPlan(requestedPlanId).then((plan) => {
          setTitle(plan.title); setAllianceName(plan.allianceName); setNotes(plan.notes);
          setPlayers(ensureTrailingBlank(plan.players));
          const defaults = cloneDefaultBuildings();
          setBuildings(defaults.map((building) => plan.buildings.find((item) => item.id === building.id) ? { ...building, rate: plan.buildings.find((item) => item.id === building.id)?.rate ?? building.rate, enabled: plan.buildings.find((item) => item.id === building.id)?.enabled ?? building.enabled } : building));
          setAssignments(plan.assignments); setLoading(false);
        }).catch((loadError: Error) => { setError(loadError.message); setLoading(false); });
      } else setLoading(false);
    }).catch((authError) => { setError(authError instanceof Error ? authError.message : 'تعذر التحقق من جلسة الحساب.'); setLoading(false); });
  }, [requestedPlanId, router]);

  const activePlayers = useMemo(() => players.filter((player) => player.name.trim() && player.power > 0), [players]);
  const result = useMemo(() => resultsFromAssignments(activePlayers, buildings, assignments), [activePlayers, buildings, assignments]);

  // Names that appear more than once among active players, keyed in lower case.
  const duplicateNameSet = useMemo(() => {
    const counts = new Map<string, number>();
    for (const player of activePlayers) {
      const key = player.name.trim().toLocaleLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const duplicated = new Set<string>();
    counts.forEach((count, name) => { if (count > 1) duplicated.add(name); });
    return duplicated;
  }, [activePlayers]);
  const duplicateNames = useMemo(
    () => activePlayers.filter((player) => duplicateNameSet.has(player.name.trim().toLocaleLowerCase())).map((player) => player.name.trim()),
    [activePlayers, duplicateNameSet],
  );
  const uniqueDuplicateNames = useMemo(() => Array.from(new Set(duplicateNames)), [duplicateNames]);
  // A row is flagged while it is still incomplete so the user sees the gap early.
  const incompletePlayers = useMemo(
    () => players.filter((player) => (player.name.trim() && player.power <= 0) || (!player.name.trim() && player.power > 0)),
    [players],
  );
  const unassignedPlayers = activePlayers.filter((player) => !assignments.some((assignment) => assignment.playerId === player.id));

  function markDirty() { setDirty(true); setMessage(''); }

  function updatePlayer(id: string, field: 'name' | 'power', value: string) {
    setPlayers((current) => ensureTrailingBlank(current.map((player) => player.id === id ? { ...player, [field]: field === 'power' ? normalizePower(value) : value } : player)));
    markDirty();
  }

  function removePlayerAt(id: string) {
    setPlayers((current) => (current.length > 1 ? ensureTrailingBlank(current.filter((player) => player.id !== id)) : current));
    setAssignments((current) => current.filter((assignment) => assignment.playerId !== id));
    if (selectedPlayerId === id) setSelectedPlayerId(null);
    markDirty();
  }

  function removeLastFilledPlayer() {
    const lastFilled = [...players].reverse().find((player) => player.name.trim() || player.power > 0);
    if (lastFilled) removePlayerAt(lastFilled.id);
  }

  function applyPastedPlayers(incoming: Player[], mode: 'replace' | 'append') {
    setPasteOpen(false);
    if (mode === 'replace') {
      setPlayers(ensureTrailingBlank(incoming));
      setAssignments([]);
      setSelectedPlayerId(null);
      setMessage(`تم استبدال القائمة بـ ${incoming.length} لاعب.`);
    } else {
      setPlayers((current) => {
        const kept = current.filter((player) => player.name.trim() || player.power > 0);
        return ensureTrailingBlank([...kept, ...incoming]);
      });
      setMessage(`تمت إضافة ${incoming.length} لاعب   .`);
    }
    setError('');
    setDirty(true);
  }

  async function copyPlayerList() {
    const text = formatPlayersForExport(players);
    if (!text) { setError('لا يوجد لاعبون للتصدير.'); return; }
    try {
      await navigator.clipboard.writeText(text);
      setMessage('تم النسخ');
    } catch {
      setError('تعذر النسخ');
    }
  }

  function toggleBuilding(id: number) {
    const currentBuilding = buildings.find((building) => building.id === id);
    setBuildings((current) => current.map((building) => building.id === id ? { ...building, enabled: !building.enabled } : building));
    if (currentBuilding?.enabled) setAssignments((current) => current.filter((assignment) => assignment.buildingId !== id));
    markDirty();
  }

  function runDistribution() {
    setError(''); setMessage(''); setSelectedPlayerId(null);
    const distribution = distributePlayers(activePlayers, buildings);
    setAssignments(distribution.assignments);
    setDirty(true);
    const coveredCount = distribution.buildings.filter((building) => building.covered).length;
    const emptyCount = distribution.uncoveredBuildingIds.length;
    const lockedSkipped = distribution.buildings.filter((building) => building.enabled && !building.covered && building.unlockMinute > 0);
    if (emptyCount === 0) {
      setMessage(`تم انشاء    ${coveredCount} مبنى.`);
      return;
    }
    const lockedNote = lockedSkipped.length ? ` المباني المغلقة (${lockedSkipped.map((building) => building.name).join('، ')}) تُفتح في الدقيقة ${lockedSkipped[0].unlockMinute}  بلا لاعب.` : '';
    setMessage(`تم التوزيع: ${coveredCount} مبنى مغطى و${emptyCount} مبنى بلا لاعب حسب اولوية النقاط.${lockedNote}`);
  }

  function generate() {
    if (duplicateNames.length) {
      setError(`يوجد اسم مكرر: ${uniqueDuplicateNames.join('، ')}. عدل الاسم .`);
      return;
    }
    if (activePlayers.length < 2) { setError('أضف لاعبين اثنين على الأقل .'); return; }
    if (!buildings.some((building) => building.enabled)) { setError('فعّل مبنى واحداً على الأقل  .'); return; }
    // Replacing an existing hand-tuned distribution would silently discard work.
    if (assignments.length && !window.confirm('سيتم استبدال التوزيع الحالي بتوزيع جديد. هل تريد المتابعة؟')) return;
    runDistribution();
  }

  function selectPlayer(playerId: string) {
    if (!activePlayers.some((player) => player.id === playerId)) return;
    setSelectedPlayerId((current) => current === playerId ? null : playerId);
    setError(''); setMessage('اختر مبنى الوجهة من الخريطة لنقل اللاعب مباشرة.');
  }

  function moveSelectedPlayer(buildingId: number) {
    if (!selectedPlayerId) return;
    const building = buildings.find((item) => item.id === buildingId);
    if (!building?.enabled) { setError('لا يمكن نقل لاعب إلى مبنى معطل.'); return; }
    setAssignments((current) => [...current.filter((assignment) => assignment.playerId !== selectedPlayerId), { playerId: selectedPlayerId, buildingId }]);
    setSelectedPlayerId(null); setError(''); setDirty(true); setMessage(`تم نقل اللاعب إلى ${building.name}.`);
  }

  function swapPlayers(playerId: string) {
    if (!selectedPlayerId) { selectPlayer(playerId); return; }
    if (selectedPlayerId === playerId) { setSelectedPlayerId(null); return; }
    if (!assignments.some((assignment) => assignment.playerId === selectedPlayerId) || !assignments.some((assignment) => assignment.playerId === playerId)) { selectPlayer(playerId); return; }
    setAssignments((current) => applySwap(current, selectedPlayerId, playerId));
    setSelectedPlayerId(null); setError(''); setDirty(true); setMessage('تم تبديل اللاعبين وإعادة حساب قوة المشاركين من قوة الفريق.');
  }

  async function persist(asDraft = false) {
    setError(''); setMessage('');
    if (!userId || !supabase) { setError('يجب تسجيل الدخول وإعداد الحساب قبل الحفظ.'); return; }
    if (duplicateNames.length) { setError(`لا يمكن الحفظ مع اسم مكرر: ${uniqueDuplicateNames.join('، ')}.`); return; }
    setBusy(true);
    try {
      const idMap = new Map<string, string>();
      const normalizedPlayers = activePlayers.map((player) => { const id = uuidPattern.test(player.id) ? player.id : crypto.randomUUID(); idMap.set(player.id, id); return { ...player, id }; });
      const normalizedAssignments = assignments.map((assignment) => ({ ...assignment, playerId: idMap.get(assignment.playerId) ?? assignment.playerId }));
      const status: PlanDraft['status'] = asDraft ? 'draft' : assignments.length ? 'ready' : 'draft';
      const plan: PlanDraft = { id: requestedPlanId ?? undefined, title, allianceName, notes, warDurationSeconds: 1800, players: normalizedPlayers, buildings, assignments: normalizedAssignments, status };
      const savedId = await savePlan(plan, userId);
      setPlayers((current) => current.map((player) => ({ ...player, id: idMap.get(player.id) ?? player.id })));
      setAssignments(normalizedAssignments);
      setDirty(false);
      setMessage(asDraft ? 'تم حفظ الخطة كمسودة.' : 'تم حفظ الخطة في سجل الحساب.');
      if (!requestedPlanId) router.replace(`/plan?id=${savedId}`);
    } catch (saveError) { setError(translateAuthError(saveError) || 'تعذر الحفض .'); }
    finally { setBusy(false); }
  }

  if (loading) return <AppShell><div className="container-page py-20 text-center text-muted">جار تحميل البيانات...</div></AppShell>;

  return <AppShell><div className="container-page py-8 sm:py-10">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="eyebrow">PLAN BUILDER / 30 MIN</span>
        <h1 className="heading-lg mt-2"> انشاء خطة </h1>
        <p className="muted mt-2">أاكتب اسماء اللاعبين وقوة الفريق لكل لاعب او قم بلصق القائمة كاملة ان وجدت لديك قم بالنقر على بدء التوزيع ثم انتقل الى الصورة يمكنك النقر على اسم اللاعب والنقر على اسم لاعب اخر للتبديل اذا اردت ان تقوم بالتعديل بشكل يدوي</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {dirty && <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-3 py-1.5 text-xs font-bold text-amber"><span className="h-1.5 w-1.5 rounded-full bg-amber" />  غير محفوظة</span>}
        <button className="btn-secondary" onClick={() => router.push('/dashboard')}><ArrowLeft size={16} /> رجوع</button>
        <button className="btn-secondary" onClick={() => void persist(true)} disabled={busy}><FileText size={16} /> حفظ ك مسودة</button>
        <button className="btn-primary" onClick={() => void persist(false)} disabled={busy}><Save size={16} />{busy ? 'جار الحفظ...' : 'حفظ الخطة'}</button>
      </div>
    </div>

    {!isSupabaseConfigured && <div className="mb-6"><SetupNotice /></div>}
    {error && <div className="mb-6"><ErrorMessage message={error} /></div>}
    {message && <div className="mb-6"><SuccessMessage message={message} /></div>}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]">
      <div className="space-y-6">
        <section className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <div><span className="eyebrow">01 / DETAILS</span><h2 className="mt-1 text-lg font-black text-strong">بيانات الخطة</h2></div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-black text-white"><Clock size={13} /> 30 دقيقة ثابتة</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">اسم الخطة في سجل الحساب</span><input className="field" value={title} onChange={(event) => { setTitle(event.target.value); markDirty(); }} placeholder="مثلا حرب تحديد مستوى او اي اسم تريده لن يظهر في الصورة سيظهر في الحساب هنا فقط " /></label>
            <label className="block"><span className="label">اسم الخطة في الصورة</span><input className="field" value={allianceName} onChange={(event) => { setAllianceName(event.target.value); markDirty(); }} placeholder="مثلا الفريق B او الفريق A" /></label>
            <label className="block sm:col-span-2"><span className="label">ملاحظات خاصة لن تظهر في الصورة <span className="font-normal text-muted">(اختياري)</span></span><textarea className="field min-h-24 resize-y" value={notes} onChange={(event) => { setNotes(event.target.value); markDirty(); }} placeholder="   " /></label>
          </div>
        </section>

        <section className="panel p-5">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow">02 / PLAYERS</span>
              <h2 className="mt-1 text-lg font-black text-strong">تسجيل الاشخاص  </h2>
              <p className="mt-1 text-xs text-muted">يمكنك لصق القائمة كاملة بدل الإدخال اليدوي  </p>
            </div>
            <span className="rounded-full border border-line bg-panel2 px-3 py-1 text-xs font-black text-strong">{activePlayers.length} لاعب مشارك</span>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => setPasteOpen(true)}><ClipboardPaste size={16} /> لصق قائمة المشاركين</button>
            <button className="btn-ghost" onClick={() => void copyPlayerList()}><Copy size={15} /> نسخ القائمة</button>
          </div>

          {duplicateNames.length > 0 && (
            <div className="mb-4 flex gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs leading-6 text-danger" role="alert">
              <AlertTriangle size={15} className="mt-1 shrink-0 text-danger" />
              <span>اسم مكرر: <strong>{uniqueDuplicateNames.join('، ')}</strong>.    يرجى تعديل الاسم .</span>
            </div>
          )}
          {incompletePlayers.length > 0 && (
            <div className="mb-4 flex gap-2 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-xs leading-6 text-amber">
              <AlertTriangle size={15} className="mt-1 shrink-0 text-amber" />
              <span>{incompletePlayers.length} يجب كتابة الاسم + القوة اذا نقص الاسم او القوة لن يتم تسجيله في الخطة</span>
            </div>
          )}

          <div className="mb-3 hidden grid-cols-[44px_1fr_180px_72px_40px] gap-3 px-2 text-[10px] font-black uppercase tracking-widest text-muted sm:grid">
            <span>#</span><span>اسم المشارك</span><span>القوة</span><span>نقل</span><span />
          </div>
          <div className="max-h-[530px] space-y-2 overflow-y-auto pr-1">
            {players.map((player, index) => {
              const nameKey = player.name.trim().toLocaleLowerCase();
              const isDuplicate = Boolean(nameKey) && duplicateNameSet.has(nameKey);
              const isIncomplete = Boolean(nameKey) !== player.power > 0;
              // The trailing blank row is the "next" slot: deleting it would just
              // recreate it, so its remove control stays disabled.
              const isTrailingBlank = isBlankPlayer(player) && index === players.length - 1;
              const borderClass = selectedPlayerId === player.id ? 'border-brand/70 bg-brand-soft/30' : isDuplicate ? 'border-danger/60 bg-danger/10' : isIncomplete ? 'border-amber/40 bg-amber/5' : 'border-line/70 bg-fill';
              return (
                <div key={player.id} className={`grid grid-cols-[34px_1fr_112px_36px] gap-2 rounded-xl border p-2 sm:grid-cols-[44px_1fr_180px_72px_40px] sm:gap-3 ${borderClass}`}>
                  <span className="grid place-items-center text-xs font-black text-muted">{String(index + 1).padStart(2, '0')}</span>
                  <input className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-sm text-strong outline-none placeholder:text-muted focus:border-brand/50" value={player.name} onChange={(event) => updatePlayer(player.id, 'name', event.target.value)} placeholder="اسم المشارك" aria-label={`اسم المشارك ${index + 1}`} aria-invalid={isDuplicate} />
                  <input className="w-full rounded-lg border border-transparent bg-transparent px-2 text-sm tabular-nums text-brand outline-none placeholder:text-muted focus:border-brand/50" inputMode="numeric" value={player.power || ''} onChange={(event) => updatePlayer(player.id, 'power', event.target.value)} placeholder="القوة" aria-label={`قوة المشارك ${index + 1}`} />
                  <button className="hidden items-center justify-center gap-1 rounded-lg text-[10px] font-bold text-brand hover:bg-brand-soft sm:flex" onClick={() => selectPlayer(player.id)} disabled={!nameKey || player.power <= 0} title="اختر شخص لنقله"><MoveRight size={14} /> نقل</button>
                  <button className="grid place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30" onClick={() => removePlayerAt(player.id)} disabled={isTrailingBlank} aria-label={`حذف  ${index + 1}`}><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="btn-secondary" onClick={removeLastFilledPlayer} disabled={!players.some((player) => !isBlankPlayer(player))}><Minus size={16} /> حذف  </button>
            <span className="text-xs text-muted">عند تسجيل الاسم والقوة سيظهر حقل جديد لتسجيل شخص اخر بشكل ديناميكي</span>
          </div>
        </section>

        <section className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <div><span className="eyebrow">03 / BUILDINGS</span><h2 className="mt-1 text-lg font-black text-strong">مباني الخريطة</h2></div>
            <span className="text-xs text-muted">{buildings.filter((building) => building.enabled).length}/11 مفعلة</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((building) => (
              <button type="button" key={building.id} onClick={() => toggleBuilding(building.id)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-right transition ${building.enabled ? 'border-brand/30 bg-brand-soft/60' : 'border-line bg-fill opacity-60'}`} aria-pressed={building.enabled}>
                <span>
                  <span className="block text-sm font-black text-strong">{building.name}</span>
                  <span className="mt-1 block text-xs text-muted">+{building.rate} نقطة/ثانية</span>
                  <span className={`mt-1 block text-[11px] font-bold ${building.unlockMinute > 0 ? 'text-amber' : 'text-brand'}`}>{building.unlockMinute > 0 ? `تُفتح في الدقيقة ${building.unlockMinute}` : 'متاحة من البداية'}</span>
                </span>
                <span className={`grid h-6 w-6 place-items-center rounded-full border ${building.enabled ? 'border-brand bg-brand text-white' : 'border-line text-muted'}`}>{building.enabled && <Check size={14} />}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-soft p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="eyebrow">04 / ACTION</span>
              <h2 className="mt-1 text-lg font-black text-strong">ابدأ ببناء خطة الفوز  </h2>
              <p className="mt-1 text-xs leading-6 text-muted">التوزيع على حسب البيانات التالي عدد المباني = عدد المشاركين سيكون 1 لكل مبنى اذا كان عدد المشاركين اكبر سيتم التوزيع 2 لكل مبنى او اكثر حسب فائدة كل مبنى لكسب نقاط اكثر ورفع احتمالية الفوز </p>
            </div>
            <button onClick={generate} className="btn-primary"><Sparkles size={17} /> بدء التوزيع</button>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <MapBoard title={title} allianceName={allianceName} players={activePlayers} buildings={buildings} assignments={assignments} selectedPlayerId={selectedPlayerId} onPlayerClick={swapPlayers} onBuildingClick={moveSelectedPlayer} />

        {unassignedPlayers.length > 0 && (
          <section className="panel p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-strong"><MoveRight size={16} className="text-brand" /> اشخاص غير موزعين</div>
            <div className="flex flex-wrap gap-2">
              {unassignedPlayers.map((player) => (
                <button key={player.id} onClick={() => selectPlayer(player.id)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${selectedPlayerId === player.id ? 'border-brand bg-brand-soft text-brand' : 'border-line text-strong'}`}>{player.name} · {formatPower(player.power)}</button>
              ))}
            </div>
          </section>
        )}

        <section className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <div><span className="eyebrow">RESULT / BALANCE</span><h2 className="mt-1 text-lg font-black text-strong">ملخص التوزيع</h2></div>
            <button className="btn-ghost" onClick={generate} disabled={!activePlayers.length}><RefreshCw size={15} /> إعادة التوزيع</button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="panel-soft p-3"><span className="text-xs text-muted">القوة الاجمالية لمجموع الفيالق للمشاركين</span><strong className="stat-number">{formatPower(result.totalPower)}</strong></div>
            <div className="panel-soft p-3"><span className="text-xs text-muted">عدد المشاركين</span><strong className="stat-number">{result.assignedPlayers}</strong></div>
            <div className="panel-soft p-3"><span className="text-xs text-muted">المباني </span><strong className="stat-number text-brand">{result.buildings.filter((building) => building.covered).length}</strong></div>
            <div className="panel-soft p-3"><span className="text-xs text-muted">النقاط المتوقعة | غير دقيق </span><strong className="stat-number">{result.expectedPoints.toLocaleString('en-US')}</strong></div>
          </div>
          <div className="mt-4 space-y-2 text-xs leading-6 text-muted">
            <p>التوازن بين المجموعات: <strong className="text-strong">{result.balanceScore}%</strong> — كلما ارتفع قلّ الفارق بين قوة المجموعات.</p>
            {result.buildings.some((building) => building.enabled && !building.covered && building.unlockMinute > 0) && (
              <p className="text-amber">المباني المغلقة ستبقى فارغة {result.buildings.filter((building) => building.enabled && !building.covered && building.unlockMinute > 0).map((building) => `${building.name} (الدقيقة ${building.unlockMinute})`).join('، ')}.</p>
            )}
          </div>
        </section>
      </div>
    </div>

    {pasteOpen && (
      <PastePanel
        existingNames={players.map((player) => player.name)}
        onCancel={() => setPasteOpen(false)}
        onConfirm={applyPastedPlayers}
      />
    )}
  </div></AppShell>;
}
