'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/app/components/BrandMark';
import { ErrorMessage, SuccessMessage } from '@/app/components/StatusMessage';
import { isSupabaseConfigured, supabase } from '@/app/lib/supabase';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isLogin = mode === 'login';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setSuccess(''); setBusy(true);
    const client = supabase;
    if (!client || !isSupabaseConfigured) { setError('لم يتم إعداد Supabase بعد. راجع ملف README وأضف متغيرات البيئة.'); setBusy(false); return; }
    try {
      if (!isLogin && !displayName.trim()) { setError('اكتب اسم صاحب الحساب أولاً.'); return; }
      const result = isLogin
        ? await client.auth.signInWithPassword({ email: email.trim(), password })
        : await client.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() } } });
      if (result.error) { setError(result.error.message); return; }
      if (isLogin || result.data.session) router.push('/dashboard');
      else setSuccess('تم إنشاء الحساب. إذا كان تأكيد البريد مفعلاً في Supabase، عطّله من إعدادات Email حتى يتم الدخول مباشرة.');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'تعذر الاتصال بخدمة الحسابات. حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="grid min-h-screen place-items-center px-4 py-12"><div className="w-full max-w-md"><div className="mb-8 flex justify-center"><BrandMark /></div><div className="panel p-6 sm:p-8"><div className="mb-8"><div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-cyan-soft text-cyan"><LockKeyhole size={22} /></div><span className="eyebrow">EQA TACTICAL / ACCOUNT</span><h1 className="mt-2 text-2xl font-black text-white">{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</h1><p className="mt-2 text-sm leading-7 text-[#8ea6aa]">{isLogin ? 'افتح خططك المحفوظة وتابع من حيث توقفت.' : 'أنشئ حساباً مستقلاً ببريد إلكتروني فريد.'}</p></div>{error && <div className="mb-4"><ErrorMessage message={error} /></div>}{success && <div className="mb-4"><SuccessMessage message={success} /></div>}<form onSubmit={submit} className="space-y-5">{!isLogin && <label className="block"><span className="label inline-flex items-center gap-2"><UserRound size={14} /> اسم صاحب الحساب</span><input className="field" type="text" required autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="مثال: أبو علي" /></label>}<label className="block"><span className="label inline-flex items-center gap-2"><Mail size={14} /> البريد الإلكتروني</span><input className="field" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label className="block"><span className="label inline-flex items-center gap-2"><LockKeyhole size={14} /> كلمة المرور</span><input className="field" type="password" required minLength={6} autoComplete={isLogin ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="ستة أحرف على الأقل" /></label><button disabled={busy} className="btn-primary w-full py-3.5">{busy ? <Loader2 className="animate-spin" size={18} /> : <ArrowLeft size={18} />}{busy ? 'جار التنفيذ...' : isLogin ? 'دخول إلى الحساب' : 'إنشاء الحساب'}</button></form><div className="mt-6 border-t border-line pt-5 text-center text-sm text-[#8ea6aa]">{isLogin ? 'ليس لديك حساب؟ ' : 'لديك حساب مسبقاً؟ '}<Link href={isLogin ? '/signup' : '/login'} className="font-black text-cyan hover:underline">{isLogin ? 'أنشئ حساباً' : 'سجّل الدخول'}</Link></div></div><Link href="/" className="btn-ghost mx-auto mt-5 flex w-fit">العودة إلى الصفحة الرئيسية</Link></div></main>;
}
