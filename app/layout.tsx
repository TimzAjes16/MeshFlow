import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MeshFlow - Knowledge Mapping',
  description: 'Visual knowledge mapping with AI-powered auto-linking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
