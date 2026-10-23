'use client';

import Link from 'next/link';
import { ArrowLeft, FilePlus2, Map, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppShell } from '@/app/components/AppShell';
import { ErrorMessage, SetupNotice, SuccessMessage } from '@/app/components/StatusMessage';
import { formatDate } from '@/app/lib/format';
import { isSupabaseConfigured, supabase } from '@/app/lib/supabase';

interface PlanRow { id: string; title: string; notes: string | null; status: 'draft' | 'ready'; created_at: string; updated_at: string; }

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    const client = supabase;
    if (!client) { setLoading(false); return; }
    try {
      const { data: user } = await client.auth.getUser();
      if (!user.user && isSupabaseConfigured) { window.location.href = '/login'; return; }
      if (!user.user) { setLoading(false); return; }
      const { data, error: loadError } = await client.from('plans').select('id,title,notes,status,created_at,updated_at').order('updated_at', { ascending: false });
      if (loadError) throw new Error(loadError.message);
      setPlans((data ?? []) as PlanRow[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الخطط. حاول إعادة المحاولة.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function remove(id: string) {
    if (!window.confirm('هل تريد حذف هذه الخطة نهائياً؟')) return;
    try {
      const client = supabase;
      if (!client) throw new Error('Supabase غير مهيأ');
      const { error: deleteError } = await client.from('plans').delete().eq('id', id);
      if (deleteError) throw new Error(deleteError.message);
      setPlans((current) => current.filter((plan) => plan.id !== id));
      setMessage('تم حذف الخطة.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف الخطة.');
    }
  }

  return <AppShell><div className="container-page py-8 sm:py-10"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><span className="eyebrow">ARCHIVE / SAVED PLANS</span><h1 className="heading-lg mt-2">خططي المحفوظة</h1><p className="muted mt-2">كل خطة تبقى مرتبطة بحسابك ويمكن تعديلها أو حذفها.</p></div><div className="flex gap-2"><Link href="/dashboard" className="btn-secondary"><ArrowLeft size={16} /> رجوع</Link><Link href="/plan" className="btn-primary"><FilePlus2 size={17} /> خطة جديدة</Link></div></div>{!isSupabaseConfigured && <div className="mb-6"><SetupNotice /></div>}{error && <div className="mb-6"><ErrorMessage message={error} /></div>}{message && <div className="mb-6"><SuccessMessage message={message} /></div>}{loading ? <div className="py-20 text-center text-muted">جار تحميل الخطط...</div> : plans.length === 0 ? <div className="panel p-12 text-center"><Map className="mx-auto text-muted" size={36} /><h2 className="mt-4 text-xl font-black text-strong">لا توجد خطط محفوظة</h2><p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">عندما تحفظ أول خطة ستظهر هنا مع حالتها وتاريخ آخر تعديل.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan) => <article key={plan.id} className="panel flex flex-col p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="eyebrow">PLAN / {plan.status === 'ready' ? 'READY' : 'DRAFT'}</span><h2 className="mt-2 truncate text-lg font-black text-strong">{plan.title}</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${plan.status === 'ready' ? 'bg-brand-soft text-brand' : 'bg-amber/10 text-amber'}`}>{plan.status === 'ready' ? 'جاهزة' : 'مسودة'}</span></div><p className="mt-4 min-h-12 text-sm leading-7 text-muted">{plan.notes || 'لا توجد ملاحظات مضافة.'}</p><div className="mt-5 border-t border-line pt-4 text-xs text-muted">آخر تعديل: {formatDate(plan.updated_at)}</div><div className="mt-4 flex gap-2"><Link href={`/plan?id=${plan.id}`} className="btn-primary flex-1">فتح وتعديل <ArrowLeft size={15} /></Link><button className="btn-secondary px-3 text-danger hover:border-danger/60" title="حذف الخطة" onClick={() => remove(plan.id)}><Trash2 size={16} /></button></div></article>)}</div>}</div></AppShell>;
}
