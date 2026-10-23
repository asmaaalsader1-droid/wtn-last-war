import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export function SetupNotice() {
  return (
    <div className="flex gap-3 rounded-2xl border border-amber/30 bg-amber/10 p-4 text-sm leading-7 text-amber">
      <Info className="mt-1 shrink-0 text-amber" size={18} />
      <div>
        <strong className="block text-strong">قاعدة البيانات غير مهيأة بعد</strong>
        <span>أضف متغيري Supabase في ملف البيئة ثم أعد تشغيل الموقع. لا يتم عرض بيانات تجريبية مكان بياناتك.</span>
      </div>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return <div role="alert" aria-live="assertive" className="flex gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm leading-7 text-danger"><AlertTriangle className="mt-1 shrink-0 text-danger" size={18} /><span>{message}</span></div>;
}

export function SuccessMessage({ message }: { message: string }) {
  return <div role="status" aria-live="polite" className="flex gap-3 rounded-2xl border border-brand/30 bg-brand-soft p-4 text-sm leading-7 text-brand"><CheckCircle2 className="mt-1 shrink-0 text-brand" size={18} /><span>{message}</span></div>;
}
