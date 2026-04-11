'use client';

import { useState } from 'react';
import type { CardEvent } from '@/components/VerificationCard';

interface EventLogProps {
  events: CardEvent[];
}

export function EventLog({ events }: EventLogProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed right-0 top-0 h-full z-50 flex">
      <button
        onClick={() => setOpen(!open)}
        className="self-center -mr-px px-2 py-8 bg-gray-800 text-white text-xs rounded-l-lg hover:bg-gray-700 transition-colors"
        style={{ writingMode: 'vertical-rl' }}
      >
        Event Log ({events.length})
      </button>

      {open && (
        <div className="w-80 h-full bg-gray-900 text-gray-100 border-l border-gray-700 overflow-y-auto p-4">
          <h3 className="text-sm font-semibold mb-4">Event Log</h3>
          {events.length === 0 && (
            <p className="text-xs text-gray-500">No events yet. Start a verification to see events.</p>
          )}
          {events.map((event, i) => (
            <EventEntry key={i} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventEntry({ event }: { event: CardEvent }) {
  const time = new Date(event.timestamp).toLocaleTimeString();
  const colors: Record<string, string> = {
    status: 'text-blue-400',
    success: 'text-green-400',
    error: 'text-red-400',
  };

  return (
    <div className="mb-3 text-xs border-b border-gray-800 pb-3">
      <div className="flex items-center justify-between mb-1">
        <span className={`font-mono font-semibold ${colors[event.type] ?? 'text-gray-400'}`}>
          self:{event.type}
        </span>
        <span className="text-gray-500">{time}</span>
      </div>
      <div className="text-gray-400 mb-1">Card: {event.cardId}</div>
      <pre className="text-gray-300 bg-gray-800 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
        {JSON.stringify(event.detail, null, 2)}
      </pre>
    </div>
  );
}
