'use client';

import Link from 'next/link';
import { ArrowLeft, Globe2, LockKeyhole, LogOut, Palette, Save, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/app/components/AppShell';
import { ErrorMessage, SetupNotice, SuccessMessage } from '@/app/components/StatusMessage';
import { loadDisplayName, saveDisplayName } from '@/app/lib/profile';
import { isSupabaseConfigured, supabase } from '@/app/lib/supabase';

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user && isSupabaseConfigured) { router.replace('/login'); return; }
      if (!data.user) return;
      setEmail(data.user.email ?? '');
      try { setDisplayName(await loadDisplayName(data.user.id)); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل اسم الحساب.'); }
    }).catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الحساب.'));
  }, [router]);

  async function updateName() {
    setBusy(true); setError(''); setMessage('');
    try {
      const user = (await supabase?.auth.getUser())?.data.user;
      if (!user) throw new Error('يجب تسجيل الدخول قبل تعديل الاسم.');
      if (!displayName.trim()) throw new Error('اكتب اسم صاحب الحساب.');
      await saveDisplayName(user.id, displayName);
      setMessage('تم حفظ اسم صاحب الحساب.');
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'تعذر حفظ الاسم.'); }
    finally { setBusy(false); }
  }

  async function logout() { await supabase?.auth.signOut(); router.push('/login'); }

  return <AppShell><div className="container-page max-w-4xl py-8 sm:py-10"><div className="mb-8"><span className="eyebrow">SYSTEM / SETTINGS</span><h1 className="heading-lg mt-2">الإعدادات</h1><p className="muted mt-2">إعدادات أساسية للحساب  .</p></div>{!isSupabaseConfigured && <div className="mb-6"><SetupNotice /></div>}{error && <div className="mb-4"><ErrorMessage message={error} /></div>}{message && <div className="mb-4"><SuccessMessage message={message} /></div>}<div className="space-y-4"><section className="panel p-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><UserRound size={19} /></div><div><span className="eyebrow">ACCOUNT IDENTITY</span><h2 className="mt-1 text-lg font-black text-strong">اسم صاحب الحساب</h2></div></div><div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]"><label className="block"><span className="label">الاسم في لوحة التحكم</span><input className="field" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder=" " /></label><button onClick={updateName} disabled={busy} className="btn-primary self-end"><Save size={16} />{busy ? 'جار الحفظ...' : 'حفظ الاسم'}</button></div></section><section className="panel p-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><LockKeyhole size={19} /></div><div><span className="eyebrow">ACCOUNT</span><h2 className="mt-1 text-lg font-black text-strong">الحساب</h2></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><span className="label">البريد الإلكتروني</span><div className="field text-label">{email || 'غير متصل بعد'}</div></div><div><span className="label"> </span><div className="field flex items-center gap-2 text-brand"><LockKeyhole size={15} />يرجى الاحتفاض بهذه البيانات في مكان امن  </div></div></div><button onClick={logout} className="btn-secondary mt-5 text-danger hover:border-danger/60"><LogOut size={16} /> تسجيل الخروج</button></section><section className="panel p-5"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Globe2 size={19} /></div><div><span className="eyebrow">LANGUAGE</span><h2 className="mt-1 text-lg font-black text-strong">اللغة والاتجاه</h2></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><button className="rounded-xl border border-brand/50 bg-brand-soft p-4 text-right"><strong className="block text-sm text-strong">العربية</strong><span className="mt-1 block text-xs text-brand">RTL · اللغة الحالية</span></button><button disabled className="rounded-xl border border-line bg-fill p-4 text-right opacity-60"><strong className="block text-sm text-strong">English</strong><span className="mt-1 block text-xs text-muted">LTR · قيد الصيانة</span></button></div></section><section className="panel-soft p-5"><div className="flex items-center gap-3"><Palette size={20} className="text-brand" /><div><h2 className="font-black text-strong"> نسخة تجريبية </h2><p className="mt-1 text-sm text-muted"> اذا اعجبتكم سيتم انشاء النسخة النهائية وسيتم تضمين خطة لعاصفة الوادي</p></div></div></section></div><Link href="/dashboard" className="btn-ghost mt-6"><ArrowLeft size={15} /> العودة إلى الخطط</Link></div></AppShell>;
}
