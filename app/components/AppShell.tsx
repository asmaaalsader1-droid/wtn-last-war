'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Map, Menu, Settings, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BrandMark } from '@/app/components/BrandMark';
import { isSupabaseConfigured, supabase } from '@/app/lib/supabase';

const links = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/plan', label: 'خطة جديدة', icon: Map },
  { href: '/plans', label: 'خططي المحفوظة', icon: Map },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user?.email ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase?.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="shell">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/90 backdrop-blur-xl">
        <div className="container-page flex h-[76px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="btn-ghost lg:hidden" onClick={() => setOpen((value) => !value)} aria-label="فتح القائمة">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <BrandMark />
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return <Link key={href} href={href} className={active ? 'btn-secondary border-cyan/50 text-cyan' : 'btn-ghost'}><Icon size={16} />{label}</Link>;
            })}
          </div>
          <div className="flex items-center gap-3">
            {email && <span className="hidden max-w-[180px] truncate text-xs text-[#8ea6aa] sm:block">{email}</span>}
            <button className="btn-ghost" onClick={logout} title="تسجيل الخروج"><LogOut size={17} /><span className="hidden sm:inline">خروج</span></button>
          </div>
        </div>
        {open && <nav className="border-t border-line/70 bg-panel px-4 py-3 lg:hidden">{links.map(({ href, label, icon: Icon }) => <Link key={href} onClick={() => setOpen(false)} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#c8dddd] hover:bg-cyan-soft hover:text-white"><Icon size={17} />{label}</Link>)}</nav>}
      </header>
      {!isSupabaseConfigured && <div className="container-page pt-5"><div className="rounded-xl border border-amber/25 bg-amber/10 px-4 py-2 text-xs text-[#f5d39b]">وضع الإعداد: أضف اتصال Supabase لتفعيل الحسابات والحفظ الدائم.</div></div>}
      <main>{children}</main>
    </div>
  );
}
