import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Device, DeviceState } from '@/lib/types';

export type DeviceWithState = Device & { device_state: DeviceState | null };

/** The user's cameras with their live state. Reloads on focus and on device_state changes. */
export function useDevices(ownerId: string) {
  const [devices, setDevices] = useState<DeviceWithState[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('devices')
      .select('id, owner_id, name, room, created_at, claimed_at, device_state(*)')
      .eq('owner_id', ownerId)
      .order('claimed_at', { ascending: true })
      .returns<DeviceWithState[]>();
    if (error) setError(error.message);
    else {
      setError(null);
      setDevices(data);
    }
  }, [ownerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const channel = supabase
      .channel('device-state')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'device_state' }, (msg) => {
        const s = msg.new as DeviceState;
        setDevices((list) => list?.map((d) => (d.id === s.device_id ? { ...d, device_state: s } : d)) ?? list);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return { devices, error, refreshing, refresh };
}

/** Re-render every `ms` so "online" and "x min ago" stay current. */
export function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
