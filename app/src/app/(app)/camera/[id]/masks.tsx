import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { MaskEditor } from '@/components/mask-editor';
import { Button, Card, ErrorText, T } from '@/components/ui';
import { pollUntil, sendCommand, waitForCommand } from '@/lib/commands';
import { anglesToPixel, pixelToAngles, type PixelRect } from '@/lib/masks';
import { supabase } from '@/lib/supabase';
import { space } from '@/lib/theme';
import type { DeviceCommand, MaskRect, Masks, Scan } from '@/lib/types';

const SCAN_TIMEOUT_MS = 5 * 60_000;
const APPLY_TIMEOUT_MS = 2 * 60_000;
const SIGNED_URL_SECONDS = 3600;

type Phase =
  | { kind: 'loading' }
  | { kind: 'intro' }
  | { kind: 'scanning'; status: DeviceCommand['status'] }
  | { kind: 'edit' }
  | { kind: 'saving'; step: 'save' | 'apply' }
  | { kind: 'done'; count: number }
  | { kind: 'error'; message: string; retry: () => void };

export default function MasksSetup() {
  const { id, first, rescan } = useLocalSearchParams<{ id: string; first?: string; rescan?: string }>();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [scan, setScan] = useState<Scan | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [rects, setRects] = useState<PixelRect[]>([]);
  const [savedRects, setSavedRects] = useState<MaskRect[]>([]);
  const abort = useRef(new AbortController());

  // Stop waiting on the camera when the screen closes
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    return () => controller.abort();
  }, []);

  async function showScan(s: Scan, existing: MaskRect[]) {
    const { data, error } = await supabase.storage.from('panoramas').createSignedUrl(s.pano_path, SIGNED_URL_SECONDS);
    if (error) throw error;
    setScan(s);
    setImageUrl(data.signedUrl);
    // Earlier zones are stored as angles, so they carry over to a new scan
    setRects(existing.map((m) => anglesToPixel(m, s)).filter((r) => r.x1 > r.x0 && r.y1 > r.y0));
    setPhase({ kind: 'edit' });
  }

  async function load() {
    setPhase({ kind: 'loading' });
    try {
      const [scanRes, maskRes] = await Promise.all([
        supabase
          .from('scans')
          .select('*')
          .eq('device_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle<Scan>(),
        supabase
          .from('masks')
          .select('*')
          .eq('device_id', id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle<Masks>(),
      ]);
      if (scanRes.error) throw scanRes.error;
      if (maskRes.error) throw maskRes.error;
      const existing = maskRes.data?.rects ?? [];
      setSavedRects(existing);
      if (!scanRes.data || rescan) setPhase({ kind: 'intro' });
      else await showScan(scanRes.data, existing);
    } catch (e) {
      setPhase({ kind: 'error', message: (e as Error).message, retry: load });
    }
  }

  async function startScan() {
    setPhase({ kind: 'scanning', status: 'pending' });
    try {
      const cmd = await sendCommand(id, 'scan');
      const done = await waitForCommand(cmd.id, {
        timeoutMs: SCAN_TIMEOUT_MS,
        signal: abort.current.signal,
        onStatus: (status) => setPhase({ kind: 'scanning', status }),
      });
      const scanId = String(done.result?.scan_id ?? '');
      const { data, error } = await supabase.from('scans').select('*').eq('id', scanId).single<Scan>();
      if (error) throw error;
      await showScan(data, savedRects);
    } catch (e) {
      if (abort.current.signal.aborted) return;
      setPhase({ kind: 'error', message: (e as Error).message, retry: startScan });
    }
  }

  async function save() {
    if (!scan) return;
    setPhase({ kind: 'saving', step: 'save' });
    try {
      const angles = rects.map((r) => pixelToAngles(r, scan));
      // The database assigns the version (latest + 1)
      const { data: mask, error } = await supabase
        .from('masks')
        .insert({ device_id: id, scan_id: scan.id, rects: angles })
        .select()
        .single<Masks>();
      if (error) throw error;
      setSavedRects(angles);

      setPhase({ kind: 'saving', step: 'apply' });
      const cmd = await sendCommand(id, 'apply_masks', { mask_id: mask.id, version: mask.version });
      await Promise.all([
        waitForCommand(cmd.id, { timeoutMs: APPLY_TIMEOUT_MS, signal: abort.current.signal }),
        pollUntil(
          async () => {
            const { data } = await supabase.from('device_state').select('masks_version').eq('device_id', id).single();
            return data && data.masks_version >= mask.version ? true : null;
          },
          { timeoutMs: APPLY_TIMEOUT_MS, signal: abort.current.signal },
        ),
      ]);
      setPhase({ kind: 'done', count: angles.length });
    } catch (e) {
      if (abort.current.signal.aborted) return;
      setPhase({ kind: 'error', message: (e as Error).message, retry: save });
    }
  }

  useEffect(() => {
    load();
    // Run once per camera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Back to the camera page; replace when there is no history (first setup, deep link, web reload)
  const leave = () => (!first && router.canGoBack() ? router.back() : router.replace(`/camera/${id}`));

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: first ? 'Set up camera' : 'Privacy zones' }} />
      {phase.kind === 'loading' ? <ActivityIndicator style={{ marginTop: space.xxl }} /> : null}

      {phase.kind === 'intro' ? (
        <View style={{ gap: space.xl }}>
          <View style={{ gap: space.sm }}>
            <T variant="title">Scan the room</T>
            <T>
              Next, the camera will turn all the way around and take a panorama photo. You will use it to choose
              areas you never want the camera to see.
            </T>
            <T muted>Areas you choose are blacked out on the camera itself: in what the AI looks at, in recordings and in uploads.</T>
            <T muted>The scan takes about a minute. Keep the camera where it will stay.</T>
          </View>
          <Button title="Start scan" onPress={startScan} />
          {first ? <Button variant="ghost" title="Not now" onPress={() => router.replace(`/camera/${id}`)} /> : null}
          {!first && rescan ? <Button variant="ghost" title="Cancel" onPress={leave} /> : null}
        </View>
      ) : null}

      {phase.kind === 'scanning' ? (
        <Card style={styles.center}>
          <ActivityIndicator size="large" />
          <T variant="heading">{phase.status === 'running' ? 'Scanning the room...' : 'Waiting for the camera...'}</T>
          <T muted style={{ textAlign: 'center' }}>
            {phase.status === 'running'
              ? 'The camera is turning around. This takes about a minute.'
              : 'The camera will start as soon as it receives the request.'}
          </T>
        </Card>
      ) : null}

      {phase.kind === 'edit' && scan && imageUrl ? (
        <View style={{ gap: space.lg }}>
          <View style={{ gap: space.xs }}>
            <T variant="heading">Choose areas to black out</T>
            <T muted>The camera will never see inside these boxes.</T>
          </View>
          <MaskEditor scan={scan} imageUrl={imageUrl} rects={rects} onChange={setRects} />
          <Button
            title={rects.length ? `Save ${rects.length} ${rects.length === 1 ? 'area' : 'areas'}` : 'Save with no areas'}
            onPress={save}
          />
          <Button variant="secondary" title="Rescan the room" onPress={() => setPhase({ kind: 'intro' })} />
        </View>
      ) : null}

      {phase.kind === 'saving' ? (
        <Card style={styles.center}>
          <ActivityIndicator size="large" />
          <T variant="heading">{phase.step === 'save' ? 'Saving...' : 'Sending to the camera...'}</T>
          {phase.step === 'apply' ? (
            <T muted style={{ textAlign: 'center' }}>
              Waiting for the camera to confirm.
            </T>
          ) : null}
        </Card>
      ) : null}

      {phase.kind === 'done' ? (
        <View style={{ gap: space.xl }}>
          <View style={{ gap: space.sm }}>
            <T variant="title">All set</T>
            <T>
              {phase.count
                ? 'From now on, these areas will always be black.'
                : 'No areas are blacked out. You can add some any time from the camera page.'}
            </T>
          </View>
          <Button title="Done" onPress={leave} />
        </View>
      ) : null}

      {phase.kind === 'error' ? (
        <View style={{ gap: space.lg }}>
          <ErrorText>{phase.message}</ErrorText>
          <Button title="Try again" onPress={phase.retry} />
          <Button variant="ghost" title="Back" onPress={leave} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.lg, flexGrow: 1 },
  center: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
});
