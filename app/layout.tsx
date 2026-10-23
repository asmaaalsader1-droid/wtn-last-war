import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EQA Tactical — توزيع القوة',
  description: 'منصة تكتيكية لتوزيع لاعبي التحالف على مباني الحرب.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
