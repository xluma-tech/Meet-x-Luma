import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Luma Meet - Beautiful Video Meetings',
  description: 'Create beautiful events with seamless video meetings. No downloads, no API keys, just pure WebRTC.',
  keywords: 'video meeting, webrtc, online meeting, video conference',
  authors: [{ name: 'Luma Meet' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
