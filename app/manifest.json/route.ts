import { NextResponse } from 'next/server';
import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

type WebAppManifest = MetadataRoute.Manifest;

export async function GET() {
  const isDev = process.env.NEXT_PUBLIC_ENV !== 'production';
  const iconPath = '/images/favicon/';

  const manifest: WebAppManifest = {
    name: isDev ? 'Kirtan Site (Dev)' : 'Kirtan Site',
    short_name: isDev ? 'dev.kirtan.site' : 'kirtan.site',
    description: 'Kirtan guide: Vaishnava songbook collection with lyrics and translations',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    scope: '/',
    icons: [
      {
        src: `${iconPath}android-icon-36x36.png`,
        sizes: '36x36',
        type: 'image/png',
      },
      {
        src: `${iconPath}android-icon-48x48.png`,
        sizes: '48x48',
        type: 'image/png',
      },
      {
        src: `${iconPath}android-icon-72x72.png`,
        sizes: '72x72',
        type: 'image/png',
      },
      {
        src: `${iconPath}android-icon-96x96.png`,
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: `${iconPath}android-icon-144x144.png`,
        sizes: '144x144',
        type: 'image/png',
      },
      {
        src: `${iconPath}android-icon-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  };

  return NextResponse.json(manifest);
}
