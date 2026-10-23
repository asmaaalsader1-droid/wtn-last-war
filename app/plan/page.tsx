import { Suspense } from 'react';
import { PlanEditor } from '@/app/components/PlanEditor';

export default function PlanPage() {
  return <Suspense fallback={<div className="min-h-screen bg-ink px-6 py-20 text-center text-[#8ea6aa]">جار تحميل المحرر...</div>}><PlanEditor /></Suspense>;
}
