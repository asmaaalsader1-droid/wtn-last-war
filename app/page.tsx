import Link from 'next/link';
import { ArrowLeft, BarChart3, Check, Crosshair, Database, GitCompareArrows, ShieldCheck, Users } from 'lucide-react';
import { BrandMark } from '@/app/components/BrandMark';

const principles = [
  { icon: Crosshair, title: 'توزيع مبني على القوة', text: 'يضع النظام اللاعب القوي بجوار الأضعف لتقليل الفجوات، لا لتقسيم الأسماء عشوائياً.' },
  { icon: BarChart3, title: 'النقاط الفردية واضحة', text: 'كل مبنى يحتفظ بقيمته الخاصة، وتظهر النقاط التقديرية وفق مدة الحرب الثابتة.' },
  { icon: GitCompareArrows, title: 'تعديل يدوي آمن', text: 'بدّل لاعبين بين المباني مع تحديث القوة والنتيجة فوراً، دون فقدان الخطة.' },
  { icon: Database, title: 'خططك محفوظة', text: 'خططك مرتبطة بحسابك في PostgreSQL ويمكن فتحها من أي جهاز بعد تسجيل الدخول.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="container-page flex h-24 items-center justify-between">
        <BrandMark />
        <div className="flex items-center gap-2"><Link href="/login" className="btn-ghost">تسجيل الدخول</Link><Link href="/signup" className="btn-primary">إنشاء حساب <ArrowLeft size={16} /></Link></div>
      </header>
      <section className="container-page grid-noise relative overflow-hidden rounded-[2rem] border border-line px-6 py-16 sm:px-12 sm:py-24 lg:px-20">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <div className="eyebrow mb-5 flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-cyan" /> غرفة العمليات التكتيكية</div>
          <h1 className="heading-xl max-w-3xl">وزّع القوة بقرار محسوب،<br /><span className="text-cyan">لا بصدفة.</span></h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-[#a8c0c1] sm:text-lg">EQA Tactical يحوّل قائمة اللاعبين وخريطة المباني إلى مخطط واضح قابل للمشاركة. اجمع القوة العالية مع الأقل، حافظ على توازن المجموعات، وراجع النتيجة قبل بدء الحرب.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3"><Link href="/signup" className="btn-primary px-6 py-4">ابدأ ببناء خطة <ArrowLeft size={17} /></Link><Link href="/login" className="btn-secondary px-6 py-4">لديك حساب؟ ادخل</Link></div>
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[#7f9a9d]"><span className="inline-flex items-center gap-2"><Check size={15} className="text-cyan" /> 11 مبنى مرقماً</span><span className="inline-flex items-center gap-2"><Check size={15} className="text-cyan" /> حرب ثابتة 30 دقيقة</span><span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-cyan" /> بيانات خاصة بحسابك</span></div>
        </div>
      </section>
      <section className="container-page grid gap-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {principles.map(({ icon: Icon, title, text }) => <article key={title} className="panel-soft p-5"><div className="mb-7 grid h-10 w-10 place-items-center rounded-xl bg-cyan-soft text-cyan"><Icon size={20} /></div><h2 className="text-base font-black text-white">{title}</h2><p className="mt-3 text-sm leading-7 text-[#8ea6aa]">{text}</p></article>)}
      </section>
      <section className="container-page pb-16"><div className="panel flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8"><div><span className="eyebrow">EQA TACTICAL / 01</span><h2 className="mt-2 text-xl font-black text-white">الخريطة النهائية بصيغة قابلة للمشاركة</h2><p className="mt-2 text-sm text-[#8ea6aa]">أضف أسماء اللاعبين بجوار كل مبنى وصدّر المخطط كصورة PNG واضحة.</p></div><Users className="hidden text-cyan sm:block" size={40} /></div></section>
      <footer className="container-page border-t border-line/70 py-7 text-xs text-[#8ea6aa]">EQA Tactical — أداة تخطيط مستقلة. لا تنفذ أوامر داخل اللعبة.</footer>
    </div>
  );
}
