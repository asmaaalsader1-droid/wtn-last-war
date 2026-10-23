'use client';

import Link from 'next/link';
import { ArrowLeft, FilePlus2, MapPinned, ShieldCheck, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppShell } from '@/app/components/AppShell';
import { ErrorMessage, SetupNotice } from '@/app/components/StatusMessage';
import { formatDate, formatPower } from '@/app/lib/format';
import { loadDisplayName } from '@/app/lib/profile';
import { isSupabaseConfigured, supabase } from '@/app/lib/supabase';

interface PlanRow { id: string; title: string; status: 'draft' | 'ready'; created_at: string; updated_at: string; }

export function DashboardView() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [power, setPower] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = supabase;
    if (!client) { setLoading(false); return; }
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user && isSupabaseConfigured) { window.location.href = '/login'; return; }
      if (!data.user) { setLoading(false); return; }
      setEmail(data.user.email ?? '');
      try { setDisplayName(await loadDisplayName(data.user.id)); } catch { setDisplayName(''); }
      const { data: planRows, error: planError } = await client.from('plans').select('id,title,status,created_at,updated_at').order('updated_at', { ascending: false });
      if (planError) setError(planError.message);
      const rows = (planRows ?? []) as PlanRow[];
      setPlans(rows);
      const ids = rows.map((plan) => plan.id);
      if (ids.length) {
        const { data: playerRows } = await client.from('players').select('power').in('plan_id', ids);
        const typedRows = (playerRows ?? []) as Array<{ power: number }>;
        setPlayerCount(typedRows.length);
        setPower(typedRows.reduce((sum, player) => sum + Number(player.power), 0));
      }
      setLoading(false);
    }).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل بيانات الحساب. حاول إعادة المحاولة.');
      setLoading(false);
    });
  }, []);

  if (loading) return <AppShell><div className="container-page py-20 text-center text-[#8ea6aa]">جار تجهيز غرفة العمليات...</div></AppShell>;
  return <AppShell><div className="container-page py-8 sm:py-10"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><span className="eyebrow">COMMAND CENTER / DASHBOARD</span><h1 className="heading-lg mt-2">لوحة التحكم</h1><p className="muted mt-2">{displayName || email ? `مرحباً، ${displayName || email}` : 'أضف اتصال Supabase لبدء حفظ الخطط.'}</p></div><Link href="/plan" className="btn-primary"><FilePlus2 size={17} /> إنشاء خطة</Link></div>{!isSupabaseConfigured && <div className="mb-6"><SetupNotice /></div>}{error && <div className="mb-6"><ErrorMessage message={error} /></div>}<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="panel p-5"><span className="text-xs text-[#8ea6aa]">الخطط المحفوظة</span><strong className="stat-number">{plans.length}</strong><span className="mt-2 block text-xs text-cyan">مرتبطة بحسابك</span></div><div className="panel p-5"><span className="text-xs text-[#8ea6aa]">اللاعبون المدخلون</span><strong className="stat-number">{playerCount}</strong><span className="mt-2 block text-xs text-[#8ea6aa]">من جميع الخطط</span></div><div className="panel p-5"><span className="text-xs text-[#8ea6aa]">القوة المسجلة</span><strong className="stat-number">{formatPower(power)}</strong><span className="mt-2 block text-xs text-[#8ea6aa]">قراءة من قاعدة البيانات</span></div><div className="panel p-5"><span className="text-xs text-[#8ea6aa]">مدة الحرب</span><strong className="stat-number text-cyan">30<span className="mr-1 text-sm">د</span></strong><span className="mt-2 block text-xs text-[#8ea6aa]">ثابتة لكل خطة</span></div></section><section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><div className="panel p-5"><div className="mb-5 flex items-center justify-between"><div><span className="eyebrow">RECENT PLANS</span><h2 className="mt-1 text-lg font-black text-white">آخر الخطط</h2></div><Link href="/plans" className="btn-ghost">كل الخطط <ArrowLeft size={15} /></Link></div>{plans.length === 0 ? <div className="rounded-xl border border-dashed border-line p-8 text-center"><MapPinned className="mx-auto text-[#658286]" size={30} /><h3 className="mt-4 font-black text-white">لا توجد خطط محفوظة بعد</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[#8ea6aa]">ابدأ بخطة جديدة، أضف اللاعبين، ثم احفظ التوزيع للوصول إليه من أي جهاز.</p><Link href="/plan" className="btn-primary mt-5">أنشئ أول خطة</Link></div> : <div className="space-y-2">{plans.slice(0, 5).map((plan) => <Link href={`/plan?id=${plan.id}`} key={plan.id} className="flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-[#09161a] px-4 py-3 transition hover:border-cyan/50"><div className="min-w-0"><strong className="block truncate text-sm font-black text-white">{plan.title}</strong><span className="mt-1 block text-xs text-[#8ea6aa]">آخر تعديل {formatDate(plan.updated_at)}</span></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${plan.status === 'ready' ? 'bg-cyan-soft text-cyan' : 'bg-amber/10 text-amber'}`}>{plan.status === 'ready' ? 'جاهزة' : 'مسودة'}</span></Link>)}</div>}</div><div className="panel-soft p-5"><div className="mb-5 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-soft text-cyan"><ShieldCheck size={20} /></div><div><span className="eyebrow">OPERATING RULES</span><h2 className="mt-1 text-lg font-black text-white">قواعد التوزيع</h2></div></div><div className="space-y-3 text-sm leading-7 text-[#a7bfc0]"><p className="flex gap-2"><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />مجموعتان من لاعبين أو أكثر لكل مبنى مغطى.</p><p className="flex gap-2"><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />الأقوى يساند الأقل مع تقليل فجوة القوة.</p><p className="flex gap-2"><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />المباني الأقل أهمية تبقى فارغة عند نقص العدد.</p><p className="flex gap-2"><span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />كل لاعب ضمن الخطة مرة واحدة فقط.</p></div><div className="mt-6 flex items-center gap-2 rounded-xl border border-line bg-[#09161a] p-3 text-xs text-[#8ea6aa]"><UsersRound size={16} className="text-cyan" />التوزيع ثابت طوال الحرب ومدتها 30 دقيقة.</div></div></section></div></AppShell>;
}
