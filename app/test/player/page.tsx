'use client';
import { useState } from 'react';

import './PlayerTestPage.scss';
import PlayerDock from '@/components/player/PlayerDock';
import PlayerWidget from '@/components/player/PlayerWidget';
import type { TPlayerSource } from '@/types/player';

const MP3_BASE =
  'https://scsmath.com/KirtanGuide/KirtanGuide8thEd-GaudiyaGitanjali-SungByManasaKrishna-final-32kbps/';

const SAMPLES: Array<{ source: TPlayerSource; title?: string }> = [
  { source: { url: MP3_BASE + 'Jasoda_Nandana_Krsna.mp3' }, title: 'Jasoda Nandana Krsna (mp3)' },
  { source: { url: MP3_BASE + 'Sri_Guru_Arati.mp3' } },
  {
    source: { url: 'https://soundcloud.com/bharatimaharaj/shchsm-karakas-dzhaya-guru' },
    title: 'Dzhaya Guru (SoundCloud)'
  },
  { source: { url: 'https://soundcloud.com/bharatimaharaj/navadwip-scsm-gurudev-morning' } }
];

const STRESS_COUNT = 100;

/**
 *
 */
export default function PlayerTestPage() {
  const [stress, setStress] = useState(false);

  return (
    <html lang="en">
      <body>
        <div className="PlayerTestPage">
          <div className="PlayerTestPage__block">
            <h1>Player test</h1>
            <p>
              Play one, then another (previous pauses). Let a track end (next starts). The dock
              stays at the bottom while a player is active (prev/next, ±5s) until closed with X.
              Drag the seek thumb fully left to restart.
            </p>
            <button className="PlayerTestPage__toggle" onClick={() => setStress(!stress)} type="button">
              {stress ? 'Hide' : 'Render'} {STRESS_COUNT} extra players
            </button>

            {SAMPLES.map(({ source, title }) => (
              <section className="PlayerTestPage__section" key={source.url}>
                <PlayerWidget source={source} title={title} />
                <div className="PlayerTestPage__spacer">scroll ↓</div>
              </section>
            ))}

            {stress &&
              Array.from({ length: STRESS_COUNT }, (_, i) => {
                const { source } = SAMPLES[i % SAMPLES.length];
                return (
                  <PlayerWidget
                    className="PlayerTestPage__stress"
                    key={i}
                    source={source}
                    title={`#${i + 1}`}
                  />
                );
              })}
          </div>
        </div>

        <PlayerDock />
      </body>
    </html>
  );
}
