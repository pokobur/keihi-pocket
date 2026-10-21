import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: '経費ポケット',
  description: '日々の支出と予算・繰越をやさしく管理できる経費管理Webアプリケーション',
};

export const viewport: Viewport = {
  themeColor: '#faf8f5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[#faf8f5] text-slate-700 antialiased selection:bg-teal-200 selection:text-teal-900">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
