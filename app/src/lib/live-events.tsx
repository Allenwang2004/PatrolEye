import { createContext, use, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';
import type { PatrolEvent } from '@/lib/types';

type Listener = (e: PatrolEvent) => void;

type LiveEvents = {
  /** Most recent event that arrived while the app was open; shown as an in-app alert. */
  latest: PatrolEvent | null;
  dismiss: () => void;
  subscribe: (fn: Listener) => () => void;
};

const LiveEventsContext = createContext<LiveEvents | null>(null);

/**
 * One Realtime subscription for new events on all of the user's cameras
 * (RLS limits what arrives). Stands in for push notifications.
 */
export function LiveEventsProvider({ children }: PropsWithChildren) {
  const [latest, setLatest] = useState<PatrolEvent | null>(null);
  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    const channel = supabase
      .channel('events-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (msg) => {
        const e = msg.new as PatrolEvent;
        setLatest(e);
        listeners.current.forEach((fn) => fn(e));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const value: LiveEvents = {
    latest,
    dismiss: () => setLatest(null),
    subscribe: (fn) => {
      listeners.current.add(fn);
      return () => listeners.current.delete(fn);
    },
  };

  return <LiveEventsContext value={value}>{children}</LiveEventsContext>;
}

export function useLiveEvents() {
  const value = use(LiveEventsContext);
  if (!value) throw new Error('useLiveEvents must be used inside <LiveEventsProvider>');
  return value;
}
