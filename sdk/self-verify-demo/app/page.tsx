'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { VerificationCard, type CardEvent } from '@/components/VerificationCard';
import { PRESETS } from '@/lib/presets';
import { EventLog } from '@/components/EventLog';
import { ServerAuthSection } from '@/components/ServerAuthSection';

export default function Home() {
  const [events, setEvents] = useState<CardEvent[]>([]);

  function handleEvent(event: CardEvent) {
    setEvents((prev) => [event, ...prev]);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Identity Verification, One Line of Code</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Add privacy-preserving identity verification to any website. Users prove claims about themselves without revealing unnecessary personal data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PRESETS.map((preset) => (
            <VerificationCard key={preset.id} preset={preset} onEvent={handleEvent} />
          ))}
        </div>

        <ServerAuthSection />
        <footer className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-500 pb-8">
          <p>Self Verify requires a modern browser (Chrome 113+, Safari 17+, Firefox 128+) for client-side token verification.</p>
          <p className="mt-1">
            <a href="https://self.xyz" className="underline hover:text-gray-600 dark:hover:text-gray-300">self.xyz</a>
          </p>
        </footer>
      </main>
      <EventLog events={events} />
    </div>
  );
}
