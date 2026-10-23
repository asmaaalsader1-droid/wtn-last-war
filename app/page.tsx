import Link from 'next/link';
import { ArrowLeft, BarChart3, Check, Crosshair, Database, GitCompareArrows, ShieldCheck, Users } from 'lucide-react';
import { BrandMark } from '@/app/components/BrandMark';

const principles = [
  { icon: Crosshair, title: 'توزيع مدروس  ', text: 'يتم توزيع  اللاعبين قوي + متوسط + ضعيف عند كل مبنى بحسب اهميته' },
  { icon: BarChart3, title: 'النقاط الفردية ', text: 'رسم بياني للنقاط الفردية لكل لاعب + اجمالي قوة اللاعبين' },
  { icon: GitCompareArrows, title: 'تعديل يدوي آمن', text: 'بعد لصق او كتابة اسماء الاعبين يمكنك النقر على اي لاعب ولاعب اخر لتبديل الادوار ' },
  { icon: Database, title: 'خططك محفوظة', text: 'يجب انشاء حساب للتمكن من تخزين الخطط السابقة وانشاء خطط جديده وتعديل ملفك الشخصي ' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="container-page flex h-24 items-center justify-between">
        <BrandMark />
        <div className="flex items-center gap-2"><Link href="/login" className="btn-ghost">تسجيل الدخول</Link><Link href="/signup" className="btn-primary">إنشاء حساب <ArrowLeft size={16} /></Link></div>
      </header>
      <section className="container-page grid-noise relative overflow-hidden rounded-[2rem] border border-line px-6 py-16 sm:px-12 sm:py-24 lg:px-20">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative max-w-4xl">
          <h1 className="heading-xl max-w-3xl">توزيع الفريق بشكل متساوي ،<br /><span className="text-brand">عاصفة الصحراء</span></h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-muted sm:text-lg">EQA Tactical سجل اسم كل لاعب + قوته وسيتم توزيع المشاركين بحسب قوتهم واهمية كل مبنى  </p>
          <div className="mt-9 flex flex-wrap items-center gap-3"><Link href="/signup" className="btn-primary px-6 py-4">ابدأ الان   <ArrowLeft size={17} /></Link><Link href="/login" className="btn-secondary px-6 py-4">لديك حساب؟ ادخل</Link></div>
        </div>
      </section>
      <section className="container-page grid gap-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {principles.map(({ icon: Icon, title, text }) => <article key={title} className="panel-soft p-5"><div className="mb-7 grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon size={20} /></div><h2 className="text-base font-black text-strong">{title}</h2><p className="mt-3 text-sm leading-7 text-muted">{text}</p></article>)}
      </section>
      <section className="container-page pb-16"><div className="panel flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8"><div><span className="eyebrow">EQA TACTICAL / 01</span><h2 className="mt-2 text-xl font-black text-strong">الخريطة النهائية قابلة للمشاركة</h2><p className="mt-2 text-sm text-muted">بعد الانتهاء من توزيع اللاعبين ستحصل على صورة باسم تحالفك او باسم الفريق B /A ليتم مشاركة الخطة في اعلانات التحالف</p></div><Users className="hidden text-brand sm:block" size={40} /></div></section>
      <footer className="container-page border-t border-line/70 py-7 text-xs text-muted">تخطيط وتنفيذ FAYIZ | TEAM WTNX</footer>
    </div>
  );
}
