import { Suspense } from 'react';
import { PlanEditor } from '@/app/components/PlanEditor';

export default function PlanPage() {
  return <Suspense fallback={<div className="min-h-screen bg-panel px-6 py-20 text-center text-muted">جار تحميل المحرر...</div>}><PlanEditor /></Suspense>;
}
