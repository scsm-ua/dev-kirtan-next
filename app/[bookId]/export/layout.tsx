import type { Metadata } from 'next';

/**/
export const metadata: Metadata = { robots: 'noindex' };

/**/
export default function ExportLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
