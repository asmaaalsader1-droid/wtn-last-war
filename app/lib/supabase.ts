import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cloneDefaultBuildings } from '@/app/lib/buildings';
import type { Building, PlanDraft } from '@/app/types/domain';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

async function savePlanLegacy(plan: PlanDraft, userId: string, planId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase غير مهيأ بعد.');
  const { data: savedPlan, error: planError } = await supabase.from('plans').upsert({
    id: planId,
    owner_id: userId,
    title: plan.title.trim() || 'خطة بلا عنوان',
    alliance_name: plan.allianceName.trim() || null,
    notes: plan.notes.trim() || null,
    war_duration_seconds: plan.warDurationSeconds,
    status: plan.status,
    updated_at: new Date().toISOString(),
  }).select('id').single();
  if (planError) throw new Error(planError.message);
  const savedId = savedPlan.id as string;
  const assignmentsDelete = await supabase.from('assignments').delete().eq('plan_id', savedId);
  if (assignmentsDelete.error) throw new Error('تعذر تنظيف إسنادات الخطة القديمة قبل الحفظ.');
  const playersDelete = await supabase.from('players').delete().eq('plan_id', savedId);
  const buildingsDelete = await supabase.from('plan_buildings').delete().eq('plan_id', savedId);
  if (playersDelete.error || buildingsDelete.error) throw new Error('تعذر تنظيف بيانات الخطة القديمة قبل الحفظ.');
  const players = plan.players.filter((player) => player.name.trim() && player.power > 0);
  if (players.length) {
    const { error } = await supabase.from('players').insert(players.map((player) => ({ id: player.id, plan_id: savedId, name: player.name.trim(), power: player.power })));
    if (error) throw new Error(error.message);
  }
  const { error: buildingsError } = await supabase.from('plan_buildings').insert(plan.buildings.map((building) => ({ plan_id: savedId, building_number: building.id, rate: building.rate, enabled: building.enabled })));
  if (buildingsError) throw new Error(buildingsError.message);
  const validPlayerIds = new Set(players.map((player) => player.id));
  const validBuildingIds = new Set(plan.buildings.filter((building) => building.enabled).map((building) => building.id));
  const safeAssignments = plan.assignments.filter((assignment) => validPlayerIds.has(assignment.playerId) && validBuildingIds.has(assignment.buildingId));
  if (safeAssignments.length) {
    const { error } = await supabase.from('assignments').insert(safeAssignments.map((assignment) => ({ plan_id: savedId, player_id: assignment.playerId, building_number: assignment.buildingId })));
    if (error) throw new Error(error.message);
  }
  return savedId;
}

export async function savePlan(plan: PlanDraft, userId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase غير مهيأ بعد. أضف متغيرات البيئة أولاً.');
  if (userId.length === 0) throw new Error('المستخدم غير مصادق عليه.');
  const planId = plan.id ?? crypto.randomUUID();
  const { data, error } = await supabase.rpc('save_plan_bundle', {
    p_plan_id: planId,
    p_title: plan.title.trim() || 'خطة بلا عنوان',
    p_alliance_name: plan.allianceName.trim() || null,
    p_notes: plan.notes.trim() || null,
    p_war_duration_seconds: plan.warDurationSeconds,
    p_status: plan.status,
    p_players: plan.players.filter((player) => player.name.trim() && player.power > 0).map((player) => ({ id: player.id, name: player.name.trim(), power: player.power })),
    p_buildings: plan.buildings.map((building) => ({ building_number: building.id, rate: building.rate, enabled: building.enabled })),
    p_assignments: plan.assignments.map((assignment) => ({ player_id: assignment.playerId, building_number: assignment.buildingId })),
  });
  if (error) {
    if (error.code === 'PGRST202') return savePlanLegacy(plan, userId, planId);
    throw new Error(error.message);
  }
  const returnedId = typeof data === 'string' ? data : planId;
  return returnedId;
}

export async function loadPlan(planId: string): Promise<PlanDraft> {
  if (!supabase) throw new Error('Supabase غير مهيأ بعد.');
  const [{ data: plan, error: planError }, { data: players, error: playersError }, { data: buildings, error: buildingsError }, { data: assignments, error: assignmentsError }] = await Promise.all([
    supabase.from('plans').select('*').eq('id', planId).single(),
    supabase.from('players').select('*').eq('plan_id', planId).order('created_at'),
    supabase.from('plan_buildings').select('*').eq('plan_id', planId).order('building_number'),
    supabase.from('assignments').select('*').eq('plan_id', planId),
  ]);
  if (planError) throw new Error(planError.message);
  if (playersError) throw new Error(playersError.message);
  if (buildingsError) throw new Error(buildingsError.message);
  if (assignmentsError) throw new Error(assignmentsError.message);
  if (!plan) throw new Error('الخطة غير موجودة أو لا تملك صلاحية الوصول إليها.');
  const rawBuildings = (buildings ?? []) as Array<{ building_number: number; rate: number; enabled: boolean }>;
  const rawPlayers = (players ?? []) as Array<{ id: string; name: string; power: number }>;
  const rawAssignments = (assignments ?? []) as Array<{ player_id: string; building_number: number }>;
  const defaults = cloneDefaultBuildings();
  const mappedBuildings: Building[] = defaults.map((building) => {
    const saved = rawBuildings.find((item) => item.building_number === building.id);
    return saved ? { ...building, rate: Number(saved.rate), enabled: Boolean(saved.enabled) } : building;
  });
  return {
    id: plan.id,
    title: plan.title,
    allianceName: plan.alliance_name ?? '',
    notes: plan.notes ?? '',
    warDurationSeconds: plan.war_duration_seconds,
    status: plan.status,
    players: rawPlayers.map((player) => ({ id: player.id, name: player.name, power: Number(player.power) })),
    buildings: mappedBuildings,
    assignments: rawAssignments.map((assignment) => ({ playerId: assignment.player_id, buildingId: assignment.building_number })),
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
  };
}
