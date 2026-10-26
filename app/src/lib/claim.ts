/** Parse the camera's QR code: patroleye://claim?d=<device_id>&c=<claim_code> */
export function parseClaimUri(data: string): { deviceId: string; code: string } | null {
  const m = /^patroleye:\/\/claim\?(.+)$/i.exec(data.trim());
  if (!m) return null;
  const params = new URLSearchParams(m[1]);
  const deviceId = params.get('d');
  const code = params.get('c');
  if (!deviceId || !code) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId)) return null;
  return { deviceId: deviceId.toLowerCase(), code: code.toUpperCase() };
}
