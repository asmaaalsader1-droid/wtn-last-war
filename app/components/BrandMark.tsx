import Link from 'next/link';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-3" aria-label="EQA Tactical">
      <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-brand/50 bg-brand-soft text-brand shadow-[0_0_28px_rgba(68,214,196,.12)]">
        <span className="absolute h-5 w-5 rounded-full border border-brand/70" />
        <span className="absolute h-px w-7 bg-brand/70" />
        <span className="absolute h-7 w-px bg-brand/70" />
        <span className="relative text-sm font-black">E</span>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-sm font-black tracking-[0.14em] text-strong">EQA</span>
          <span className="mt-1 block text-[10px] font-bold tracking-[0.2em] text-brand">TACTICAL</span>
        </span>
      )}
    </Link>
  );
}
