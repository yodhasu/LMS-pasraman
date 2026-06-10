import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata: Metadata = {
  title: 'Pasraman Wira Satya Bhuana',
  description: 'LMS Pendidikan Agama Hindu — Pasraman Wira Satya Bhuana',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-[#FBF8F4] text-[#1F3D30] min-h-screen">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
