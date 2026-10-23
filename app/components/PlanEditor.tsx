'use client';

import { AlertTriangle, ArrowLeft, Check, ClipboardPaste, Copy, FileText, Loader2, Minus, MoveRight, Plus, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';
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

const DEFAULT_PLAYER_SLOTS = 20;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function blankPlayers(count: number): Player[] { return Array.from({ length: count }, (_, index) => ({ id: `slot-${index + 1}`, name: '', power: 0 })); }
function formatPower(power: number): string { return power >= 1_000_000 ? `${(power / 1_000_000).toFixed(1)}M` : power.toLocaleString('en-US'); }
function normalizePower(value: string): number { return Number(value.replace(/,/g, '').replace(/\s/g, '')) || 0; }

export function PlanEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPlanId = searchParams.get('id');
  const [title, setTitle] = useState('خطة الحرب الجديدة');
  const [allianceName, setAllianceName] = useState('');
  const [notes, setNotes] = useState('');
  const [players, setPlayers] = useState<Player[]>(() => blankPlayers(DEFAULT_PLAYER_SLOTS));
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
          setPlayers([...plan.players, ...blankPlayers(Math.max(0, DEFAULT_PLAYER_SLOTS - plan.players.length))]);
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
    setPlayers((current) => current.map((player) => player.id === id ? { ...player, [field]: field === 'power' ? normalizePower(value) : value } : player));
    markDirty();
  }

  function addPlayer() {
    setPlayers((current) => [...current, { id: `slot-${Date.now()}-${current.length}`, name: '', power: 0 }]);
    markDirty();
  }

  function removePlayerAt(id: string) {
    setPlayers((current) => (current.length > 1 ? current.filter((player) => player.id !== id) : current));
    setAssignments((current) => current.filter((assignment) => assignment.playerId !== id));
    if (selectedPlayerId === id) setSelectedPlayerId(null);
    markDirty();
  }

  function applyPastedPlayers(incoming: Player[], mode: 'replace' | 'append') {
    setPasteOpen(false);
    if (mode === 'replace') {
      setPlayers([...incoming, ...blankPlayers(Math.max(0, DEFAULT_PLAYER_SLOTS - incoming.length))]);
      setAssignments([]);
      setSelectedPlayerId(null);
      setMessage(`تم استبدال القائمة بـ ${incoming.length} لاعباً.`);
    } else {
      setPlayers((current) => {
        const kept = current.filter((player) => player.name.trim() || player.power > 0);
        const total = kept.length + incoming.length;
        return [...kept, ...incoming, ...blankPlayers(Math.max(0, DEFAULT_PLAYER_SLOTS - total))];
      });
      setMessage(`تمت إضافة ${incoming.length} لاعباً من النص الملصق.`);
    }
    setError('');
    setDirty(true);
  }

  async function copyPlayerList() {
    const text = formatPlayersForExport(players);
    if (!text) { setError('لا يوجد لاعبون للتصدير.'); return; }
    try {
      await navigator.clipboard.writeText(text);
      setMessage('تم نسخ قائمة اللاعبين. الصقها في أي مكان تحتاجه.');
    } catch {
      setError('تعذر النسخ إلى الحافظة. انسخ الأسماء يدوياً.');
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
    setMessage(distribution.uncoveredBuildingIds.length ? `تم التوزيع. بقيت ${distribution.uncoveredBuildingIds.length} مبانٍ أقل أهمية فارغة لأن العدد لا يكفي لتكوين مجموعتين من لاعبين.` : 'تم إنشاء توزيع متوازن قابل للتعديل.');
  }

  function generate() {
    if (duplicateNames.length) {
      setError(`يوجد اسم لاعب مكرر: ${uniqueDuplicateNames.join('، ')}. عدّل الأسماء قبل التوزيع.`);
      return;
    }
    if (activePlayers.length < 2) { setError('أضف لاعبين اثنين على الأقل حتى يمكن تكوين أول مجموعة.'); return; }
    if (!buildings.some((building) => building.enabled)) { setError('فعّل مبنى واحداً على الأقل قبل التوزيع.'); return; }
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
    setSelectedPlayerId(null); setError(''); setDirty(true); setMessage('تم نقل اللاعب إلى المبنى المحدد.');
  }

  function swapPlayers(playerId: string) {
    if (!selectedPlayerId) { selectPlayer(playerId); return; }
    if (selectedPlayerId === playerId) { setSelectedPlayerId(null); return; }
    if (!assignments.some((assignment) => assignment.playerId === selectedPlayerId) || !assignments.some((assignment) => assignment.playerId === playerId)) { selectPlayer(playerId); return; }
    setAssignments((current) => applySwap(current, selectedPlayerId, playerId));
    setSelectedPlayerId(null); setError(''); setDirty(true); setMessage('تم تبديل اللاعبين وإعادة حساب قوة المجموعات.');
  }

  async function persist(asDraft = false) {
    setError(''); setMessage('');
    if (!userId || !supabase) { setError('يجب تسجيل الدخول وإعداد Supabase قبل الحفظ.'); return; }
    if (duplicateNames.length) { setError(`لا يمكن الحفظ مع أسماء مكررة: ${uniqueDuplicateNames.join('، ')}.`); return; }
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
      setMessage(asDraft ? 'تم حفظ الخطة كمسودة.' : 'تم حفظ الخطة في قاعدة البيانات.');
      if (!requestedPlanId) router.replace(`/plan?id=${savedId}`);
    } catch (saveError) { setError(translateAuthError(saveError) || 'تعذر حفظ الخطة.'); }
    finally { setBusy(false); }
  }

  if (loading) return <AppShell><div className="container-page py-20 text-center text-[#8ea6aa]">جار تحميل الخطة...</div></AppShell>;

  return <AppShell><div className="container-page py-8 sm:py-10">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="eyebrow">PLAN BUILDER / 30 MIN</span>
        <h1 className="heading-lg mt-2">إنشاء وتوزيع خطة</h1>
        <p className="muted mt-2">أدخل اللاعبين، سمِّ التحالف، ثم أنشئ التوزيع الأولي وعدّله بالنقل المباشر.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {dirty && <span className="inline-flex items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-3 py-1.5 text-xs font-bold text-amber"><span className="h-1.5 w-1.5 rounded-full bg-amber" /> تغييرات غير محفوظة</span>}
        <button className="btn-secondary" onClick={() => router.push('/dashboard')}><ArrowLeft size={16} /> رجوع</button>
        <button className="btn-secondary" onClick={() => void persist(true)} disabled={busy}><FileText size={16} /> حفظ كمسودة</button>
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
            <div><span className="eyebrow">01 / DETAILS</span><h2 className="mt-1 text-lg font-black text-white">بيانات الخطة</h2></div>
            <span className="rounded-full border border-cyan/30 bg-cyan-soft px-3 py-1 text-xs font-black text-cyan">30 دقيقة ثابتة</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">اسم الخطة</span><input className="field" value={title} onChange={(event) => { setTitle(event.target.value); markDirty(); }} placeholder="مثال: حرب الجمعة" /></label>
            <label className="block"><span className="label">اسم التحالف</span><input className="field" value={allianceName} onChange={(event) => { setAllianceName(event.target.value); markDirty(); }} placeholder="مثال: تحالف الصقور" /></label>
            <label className="block sm:col-span-2"><span className="label">ملاحظات القائد <span className="font-normal text-[#8ea6aa]">(اختياري)</span></span><textarea className="field min-h-24 resize-y" value={notes} onChange={(event) => { setNotes(event.target.value); markDirty(); }} placeholder="اكتب ملاحظة مختصرة للفريق..." /></label>
          </div>
        </section>

        <section className="panel p-5">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="eyebrow">02 / PLAYERS</span>
              <h2 className="mt-1 text-lg font-black text-white">اللاعبون القابلون للتوزيع</h2>
              <p className="mt-1 text-xs text-[#8ea6aa]">الصفوف الفارغة لا تدخل في الحساب. يمكنك لصق القائمة كاملة بدل الإدخال اليدوي.</p>
            </div>
            <span className="rounded-full border border-line bg-panel2 px-3 py-1 text-xs font-black text-white">{activePlayers.length} لاعب فعّال</span>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => setPasteOpen(true)}><ClipboardPaste size={16} /> لصق قائمة اللاعبين</button>
            <button className="btn-ghost" onClick={() => void copyPlayerList()}><Copy size={15} /> نسخ القائمة</button>
          </div>

          {duplicateNames.length > 0 && (
            <div className="mb-4 flex gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs leading-6 text-[#ffc1bd]" role="alert">
              <AlertTriangle size={15} className="mt-1 shrink-0 text-danger" />
              <span>اسم مكرر: <strong>{uniqueDuplicateNames.join('، ')}</strong>. صحّحه قبل التوزيع أو الحفظ.</span>
            </div>
          )}
          {incompletePlayers.length > 0 && (
            <div className="mb-4 flex gap-2 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-xs leading-6 text-[#f8d69b]">
              <AlertTriangle size={15} className="mt-1 shrink-0 text-amber" />
              <span>{incompletePlayers.length} صف ناقص (اسم بلا قوة أو قوة بلا اسم) ولن يدخل في التوزيع.</span>
            </div>
          )}

          <div className="mb-3 hidden grid-cols-[44px_1fr_180px_72px_40px] gap-3 px-2 text-[10px] font-black uppercase tracking-widest text-[#8ea6aa] sm:grid">
            <span>#</span><span>اسم اللاعب</span><span>القوة</span><span>نقل</span><span />
          </div>
          <div className="max-h-[530px] space-y-2 overflow-y-auto pr-1">
            {players.map((player, index) => {
              const nameKey = player.name.trim().toLocaleLowerCase();
              const isDuplicate = Boolean(nameKey) && duplicateNameSet.has(nameKey);
              const isIncomplete = Boolean(nameKey) !== player.power > 0;
              const borderClass = selectedPlayerId === player.id ? 'border-cyan/70 bg-cyan-soft/30' : isDuplicate ? 'border-danger/60 bg-danger/10' : isIncomplete ? 'border-amber/40 bg-amber/5' : 'border-line/70 bg-[#09161a]';
              return (
                <div key={player.id} className={`grid grid-cols-[34px_1fr_112px_36px] gap-2 rounded-xl border p-2 sm:grid-cols-[44px_1fr_180px_72px_40px] sm:gap-3 ${borderClass}`}>
                  <span className="grid place-items-center text-xs font-black text-[#8ea6aa]">{String(index + 1).padStart(2, '0')}</span>
                  <input className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-sm text-white outline-none placeholder:text-[#8ea6aa] focus:border-cyan/50" value={player.name} onChange={(event) => updatePlayer(player.id, 'name', event.target.value)} placeholder="اسم اللاعب" aria-label={`اسم اللاعب ${index + 1}`} aria-invalid={isDuplicate} />
                  <input className="w-full rounded-lg border border-transparent bg-transparent px-2 text-sm tabular-nums text-cyan outline-none placeholder:text-[#8ea6aa] focus:border-cyan/50" inputMode="numeric" value={player.power || ''} onChange={(event) => updatePlayer(player.id, 'power', event.target.value)} placeholder="القوة" aria-label={`قوة اللاعب ${index + 1}`} />
                  <button className="hidden items-center justify-center gap-1 rounded-lg text-[10px] font-bold text-cyan hover:bg-cyan-soft sm:flex" onClick={() => selectPlayer(player.id)} disabled={!nameKey || player.power <= 0} title="اختر اللاعب لنقله"><MoveRight size={14} /> نقل</button>
                  <button className="grid place-items-center rounded-lg text-[#8ea6aa] hover:bg-danger/10 hover:text-danger" onClick={() => removePlayerAt(player.id)} disabled={players.length <= 1} aria-label={`حذف اللاعب ${index + 1}`}><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={addPlayer}><Plus size={16} /> إضافة لاعب</button>
            <button className="btn-ghost" onClick={() => removePlayerAt(players[players.length - 1]?.id ?? '')} disabled={players.length <= 1}><Minus size={16} /> حذف آخر صف</button>
          </div>
        </section>

        <section className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <div><span className="eyebrow">03 / BUILDINGS</span><h2 className="mt-1 text-lg font-black text-white">مباني الخريطة</h2></div>
            <span className="text-xs text-[#8ea6aa]">{buildings.filter((building) => building.enabled).length}/11 مفعلة</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {buildings.map((building) => (
              <button type="button" key={building.id} onClick={() => toggleBuilding(building.id)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-right transition ${building.enabled ? 'border-cyan/30 bg-cyan-soft/60' : 'border-line bg-[#09161a] opacity-60'}`} aria-pressed={building.enabled}>
                <span>
                  <span className="block text-sm font-black text-white">{building.name}</span>
                  <span className="mt-1 block text-xs text-[#8ea6aa]">+{building.rate} نقطة/ثانية</span>
                </span>
                <span className={`grid h-6 w-6 place-items-center rounded-full border ${building.enabled ? 'border-cyan bg-cyan text-ink' : 'border-line text-[#8ea6aa]'}`}>{building.enabled && <Check size={14} />}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-soft p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="eyebrow">04 / ACTION</span>
              <h2 className="mt-1 text-lg font-black text-white">أنشئ التوزيع الأولي</h2>
              <p className="mt-1 text-xs leading-6 text-[#8ea6aa]">الأولوية لقيمة المبنى، ثم توازن القوة. بعد ذلك يمكنك نقل أي لاعب إلى أي مبنى مفعّل.</p>
            </div>
            <button onClick={generate} className="btn-primary"><Sparkles size={17} /> توزيع تكتيكي</button>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <MapBoard title={title} allianceName={allianceName} players={activePlayers} buildings={buildings} assignments={assignments} selectedPlayerId={selectedPlayerId} onPlayerClick={swapPlayers} onBuildingClick={moveSelectedPlayer} />

        {unassignedPlayers.length > 0 && (
          <section className="panel p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-white"><MoveRight size={16} className="text-cyan" /> لاعبون غير موزعين</div>
            <div className="flex flex-wrap gap-2">
              {unassignedPlayers.map((player) => (
                <button key={player.id} onClick={() => selectPlayer(player.id)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${selectedPlayerId === player.id ? 'border-cyan bg-cyan-soft text-cyan' : 'border-line text-white'}`}>{player.name} · {formatPower(player.power)}</button>
              ))}
            </div>
          </section>
        )}

        <section className="panel p-5">
          <div className="mb-5 flex items-center justify-between">
            <div><span className="eyebrow">RESULT / BALANCE</span><h2 className="mt-1 text-lg font-black text-white">ملخص التوزيع</h2></div>
            <button className="btn-ghost" onClick={generate} disabled={!activePlayers.length}><RefreshCw size={15} /> إعادة التوزيع</button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="panel-soft p-3"><span className="text-xs text-[#8ea6aa]">القوة الإجمالية</span><strong className="stat-number">{formatPower(result.totalPower)}</strong></div>
            <div className="panel-soft p-3"><span className="text-xs text-[#8ea6aa]">الموزعون</span><strong className="stat-number">{result.assignedPlayers}</strong></div>
            <div className="panel-soft p-3"><span className="text-xs text-[#8ea6aa]">التوازن</span><strong className="stat-number text-cyan">{result.balanceScore}%</strong></div>
            <div className="panel-soft p-3"><span className="text-xs text-[#8ea6aa]">النقاط المتوقعة</span><strong className="stat-number">{result.expectedPoints.toLocaleString('en-US')}</strong></div>
          </div>
          <div className="mt-5 space-y-2">
            {result.buildings.filter((building) => building.enabled).map((building) => (
              <div key={building.id} className="flex items-center justify-between rounded-xl border border-line/70 bg-[#09161a] px-3 py-3">
                <div>
                  <strong className="block text-sm text-white">{building.name}</strong>
                  <span className="text-xs text-[#8ea6aa]">{building.players.length ? building.players.map((player) => player.name).join(' · ') : 'فارغ حالياً'}</span>
                </div>
                <span className="text-xs font-black text-cyan">{building.expectedPoints.toLocaleString('en-US')} نقطة</span>
              </div>
            ))}
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
