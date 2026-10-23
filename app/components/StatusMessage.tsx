import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export function SetupNotice() {
  return (
    <div className="flex gap-3 rounded-2xl border border-amber/30 bg-amber/10 p-4 text-sm leading-7 text-[#f8d69b]">
      <Info className="mt-1 shrink-0 text-amber" size={18} />
      <div>
        <strong className="block text-white">قاعدة البيانات غير مهيأة بعد</strong>
        <span>أضف متغيري Supabase في ملف البيئة ثم أعد تشغيل الموقع. لا يتم عرض بيانات تجريبية مكان بياناتك.</span>
      </div>
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return <div className="flex gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm leading-7 text-[#ffc1bd]"><AlertTriangle className="mt-1 shrink-0 text-danger" size={18} /><span>{message}</span></div>;
}

export function SuccessMessage({ message }: { message: string }) {
  return <div className="flex gap-3 rounded-2xl border border-cyan/30 bg-cyan-soft p-4 text-sm leading-7 text-[#bbf6ed]"><CheckCircle2 className="mt-1 shrink-0 text-cyan" size={18} /><span>{message}</span></div>;
}
