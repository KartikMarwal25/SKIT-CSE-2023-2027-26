import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mocks the Pinata SDK entirely — no real upload happens in this test.
const mockUploadFile = jest.fn();
jest.unstable_mockModule('pinata', () => ({
  PinataSDK: jest.fn().mockImplementation(() => ({
    upload: { public: { file: mockUploadFile } },
  })),
}));

const { createPinataAdapter } = await import('./pinata.adapter.js');

const BASE_CONFIG = {
  pinataJwt: 'fake-jwt',
  pinataGateway: 'example-gateway.mypinata.cloud',
  ipfsGatewayTimeoutMs: 5000,
};

describe('pinata.adapter — pin() (mocked SDK)', () => {
  it('returns the CID from a successful upload', async () => {
    mockUploadFile.mockResolvedValueOnce({ cid: 'bafybeigdyrztest1234567890' });
    const adapter = createPinataAdapter({ config: { ...BASE_CONFIG, ipfsGateways: [] } });

    const result = await adapter.pin(Buffer.from('pdf-bytes'), 'SKIT-2026-000000000001.pdf');

    expect(result).toEqual({ cid: 'bafybeigdyrztest1234567890' });
  });

  it('wraps a failed upload in E_PINATA_FAILED', async () => {
    mockUploadFile.mockRejectedValueOnce(new Error('network error'));
    const adapter = createPinataAdapter({ config: { ...BASE_CONFIG, ipfsGateways: [] } });

    await expect(adapter.pin(Buffer.from('x'), 'x.pdf')).rejects.toMatchObject({ code: 'E_PINATA_FAILED' });
  });
});

describe('pinata.adapter — fetchByCid() gateway failover (DP-03, mocked fetch)', () => {
  const GATEWAYS = [
    'https://example-gateway.mypinata.cloud/ipfs',
    'https://ipfs.io/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
  ];

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  it('returns the file from the first gateway when it succeeds', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new TextEncoder().encode('file-bytes').buffer });
    const adapter = createPinataAdapter({ config: { ...BASE_CONFIG, ipfsGateways: GATEWAYS } });

    const result = await adapter.fetchByCid('bafybeigdyrztest');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(`${GATEWAYS[0]}/bafybeigdyrztest`, expect.any(Object));
    expect(Buffer.from(result).toString()).toBe('file-bytes');
  });

  it('falls through to the second gateway when the first fails, in order', async () => {
    global.fetch
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new TextEncoder().encode('from-ipfs-io').buffer });
    const adapter = createPinataAdapter({ config: { ...BASE_CONFIG, ipfsGateways: GATEWAYS } });

    const result = await adapter.fetchByCid('bafybeigdyrztest');

    expect(global.fetch).toHaveBeenNthCalledWith(1, `${GATEWAYS[0]}/bafybeigdyrztest`, expect.any(Object));
    expect(global.fetch).toHaveBeenNthCalledWith(2, `${GATEWAYS[1]}/bafybeigdyrztest`, expect.any(Object));
    expect(Buffer.from(result).toString()).toBe('from-ipfs-io');
  });

  it('falls through to the third gateway when the first two return non-ok responses', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new TextEncoder().encode('from-cloudflare').buffer });
    const adapter = createPinataAdapter({ config: { ...BASE_CONFIG, ipfsGateways: GATEWAYS } });

    const result = await adapter.fetchByCid('bafybeigdyrztest');

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenNthCalledWith(3, `${GATEWAYS[2]}/bafybeigdyrztest`, expect.any(Object));
    expect(Buffer.from(result).toString()).toBe('from-cloudflare');
  });

  it('throws E_IPFS_UNAVAILABLE when every gateway fails', async () => {
    global.fetch.mockResolvedValue({ ok: false });
    const adapter = createPinataAdapter({ config: { ...BASE_CONFIG, ipfsGateways: GATEWAYS } });

    await expect(adapter.fetchByCid('bafybeigdyrztest')).rejects.toMatchObject({ code: 'E_IPFS_UNAVAILABLE' });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('keeps the failover order correct across 50 concurrent lookups (simulated load)', async () => {
    // Every call: gateway 1 fails, gateway 2 succeeds. Fired concurrently
    // (not awaited one at a time) to prove the per-call gateway loop
    // doesn't share state across in-flight calls — each fetchByCid() call
    // gets its own local loop variable, so nothing here can cross-contaminate.
    global.fetch.mockImplementation((url) => {
      if (url.startsWith(GATEWAYS[0])) return Promise.reject(new Error('gateway 1 down'));
      if (url.startsWith(GATEWAYS[1])) {
        return Promise.resolve({ ok: true, arrayBuffer: async () => new TextEncoder().encode('ok').buffer });
      }
      return Promise.resolve({ ok: false });
    });
    const adapter = createPinataAdapter({ config: { ...BASE_CONFIG, ipfsGateways: GATEWAYS } });

    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) => adapter.fetchByCid(`cid-${i}`)),
    );

    expect(results).toHaveLength(50);
    expect(results.every((r) => Buffer.from(r).toString() === 'ok')).toBe(true);
    // 50 calls x 2 gateways attempted each (1 fails, 2 succeeds) = 100 fetches.
    expect(global.fetch).toHaveBeenCalledTimes(100);
  });
});
