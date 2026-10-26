import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { CameraNameForm } from '@/components/camera-name-form';
import { Button, ErrorText, Field, T } from '@/components/ui';
import { parseClaimUri } from '@/lib/claim';
import { supabase } from '@/lib/supabase';
import { radius, space, useColors } from '@/lib/theme';

type Step = { kind: 'scan' } | { kind: 'claiming' } | { kind: 'name'; deviceId: string };

const CLAIM_FAILED = 'That code is wrong, or this camera is already set up by someone else.';

export default function AddCamera() {
  const [step, setStep] = useState<Step>({ kind: 'scan' });
  const [error, setError] = useState<string | null>(null);

  async function claim(data: string) {
    const parsed = parseClaimUri(data);
    if (!parsed) {
      setError('This is not a PatrolEye camera code.');
      return;
    }
    setError(null);
    setStep({ kind: 'claiming' });
    const { error } = await supabase.rpc('claim_device', { p_device_id: parsed.deviceId, p_code: parsed.code });
    if (error) {
      setError(error.message.includes('invalid_claim') ? CLAIM_FAILED : error.message);
      setStep({ kind: 'scan' });
      return;
    }
    setStep({ kind: 'name', deviceId: parsed.deviceId });
  }

  if (step.kind === 'name') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={{ gap: space.xs }}>
            <T variant="title">Camera added</T>
            <T muted>Give it a name so you can tell your cameras apart.</T>
          </View>
          <CameraNameForm
            deviceId={step.deviceId}
            submitLabel="Continue"
            onSaved={() => router.replace(`/camera/${step.deviceId}/masks?first=1`)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return <Scanner busy={step.kind === 'claiming'} error={error} onCode={claim} />;
}

function Scanner({ busy, error, onCode }: { busy: boolean; error: string | null; onCode: (data: string) => void }) {
  const c = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState(Platform.OS === 'web');
  const [link, setLink] = useState('');
  const lastScan = useRef<{ data: string; at: number } | null>(null);

  function onScanned({ data }: BarcodeScanningResult) {
    if (busy) return;
    // The scanner fires many times per second; ignore repeats of the same code for a few seconds
    const now = Date.now();
    if (lastScan.current && lastScan.current.data === data && now - lastScan.current.at < 4000) return;
    lastScan.current = { data, at: now };
    onCode(data);
  }

  const manualEntry = (
    <View style={{ gap: space.md }}>
      <Field
        label="Camera link"
        value={link}
        onChangeText={setLink}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="patroleye://claim?d=...&c=..."
      />
      <Button title="Add camera" onPress={() => onCode(link)} loading={busy} disabled={!link.trim()} />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={{ gap: space.xs }}>
        <T variant="title">Scan the camera</T>
        <T muted>Point your phone at the QR code shown by your PatrolEye camera.</T>
      </View>

      {error ? <ErrorText>{error}</ErrorText> : null}

      {manual ? (
        manualEntry
      ) : !permission ? (
        <ActivityIndicator />
      ) : !permission.granted ? (
        <View style={{ gap: space.md }}>
          <T>PatrolEye needs the camera to read the QR code. Nothing is recorded.</T>
          <Button title="Allow camera" onPress={requestPermission} />
        </View>
      ) : (
        <View style={[styles.viewfinder, { backgroundColor: c.surfaceMuted }]}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={busy ? undefined : onScanned}
          />
          <View pointerEvents="none" style={styles.frameWrap}>
            <View style={[styles.frame, { borderColor: '#FFFFFF' }]} />
          </View>
          {busy ? (
            <View style={[StyleSheet.absoluteFill, styles.busy, { backgroundColor: c.overlay }]}>
              <ActivityIndicator color="#FFFFFF" />
              <T color="#FFFFFF">Adding camera...</T>
            </View>
          ) : null}
        </View>
      )}

      {Platform.OS !== 'web' ? (
        <Button
          variant="ghost"
          title={manual ? 'Scan the QR code instead' : 'Enter the link instead'}
          onPress={() => setManual(!manual)}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.xl, gap: space.xl, flexGrow: 1 },
  viewfinder: { aspectRatio: 1, borderRadius: radius.lg, overflow: 'hidden' },
  frameWrap: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: '65%', aspectRatio: 1, borderWidth: 3, borderRadius: radius.lg },
  busy: { alignItems: 'center', justifyContent: 'center', gap: space.sm },
});
