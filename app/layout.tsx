import type { Metadata, Viewport } from 'next';
import { ZoomGuard } from '@/app/components/ZoomGuard';
import './globals.css';

export const metadata: Metadata = {
  title: 'EQA Tactical — توزيع القوة',
  description: 'منصة تكتيكية لتوزيع لاعبي التحالف على مباني الحرب.',
};

// `maximumScale`/`userScalable` stop the manual pinch zoom, and the 16px font
// floor set in globals.css stops iOS Safari's automatic zoom on field focus.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <ZoomGuard />
        {children}
      </body>
    </html>
  );
}
