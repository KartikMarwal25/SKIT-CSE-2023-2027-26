import { describe, it, expect, jest } from '@jest/globals';

/**
 * Integration pass against Kartik's contract stubs — mocked, not a real
 * network call. Confirms this adapter calls the contract methods on an
 * ethers.Contract instance built from the exact address/ABI shape Kartik's
 * deploy script writes to contracts/deployments/<network>.json, with the
 * arguments in the order the real contract expects.
 */
const mockIssueCertificate = jest.fn().mockResolvedValue({ hash: '0xabc123' });
const mockVerifyCertificate = jest.fn();
const MockContract = jest.fn().mockImplementation(() => ({
  issueCertificate: mockIssueCertificate,
  verifyCertificate: mockVerifyCertificate,
}));

jest.unstable_mockModule('ethers', () => ({
  ethers: { Contract: MockContract },
}));

jest.unstable_mockModule('node:fs', () => ({
  default: {
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: jest.fn().mockReturnValue(
      JSON.stringify({ address: '0xDeployedAddress', abi: [{ type: 'function', name: 'issueCertificate' }] }),
    ),
  },
}));

const { createChainAdapter } = await import('./chain.adapter.js');

describe('chain.adapter — issueCertificate (mocked)', () => {
  it('builds the contract from the deployment record and calls issueCertificate with the given args', async () => {
    const signer = {};
    const adapter = createChainAdapter({ network: 'ganache', signer });

    const result = await adapter.issueCertificate('0x' + 'a'.repeat(64), 'bafybeigdyrztest');

    expect(MockContract).toHaveBeenCalledWith('0xDeployedAddress', expect.any(Array), signer);
    expect(mockIssueCertificate).toHaveBeenCalledWith('0x' + 'a'.repeat(64), 'bafybeigdyrztest');
    expect(result).toEqual({ txHash: '0xabc123' });
  });

  it('reuses the same contract instance across calls (lazy, cached resolution)', async () => {
    MockContract.mockClear();
    const adapter = createChainAdapter({ network: 'ganache', signer: {} });

    await adapter.issueCertificate('0x' + 'b'.repeat(64), 'cid-1');
    await adapter.issueCertificate('0x' + 'c'.repeat(64), 'cid-2');

    expect(MockContract).toHaveBeenCalledTimes(1);
  });
});

describe('chain.adapter — verifyCertificate (mocked, FR-VER-006 timeout handling)', () => {
  it('maps the raw enum index to the outcome name', async () => {
    mockVerifyCertificate.mockResolvedValueOnce(0n); // VERIFIED
    const adapter = createChainAdapter({ network: 'ganache', signer: {} });

    const outcome = await adapter.verifyCertificate('0x' + 'd'.repeat(64));

    expect(outcome).toBe('VERIFIED');
  });

  it('throws E_CHAIN_UNAVAILABLE when the RPC call itself rejects', async () => {
    mockVerifyCertificate.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const adapter = createChainAdapter({ network: 'ganache', signer: {} });

    await expect(adapter.verifyCertificate('0x' + 'e'.repeat(64))).rejects.toMatchObject({
      code: 'E_CHAIN_UNAVAILABLE',
    });
  });

  it('throws E_CHAIN_UNAVAILABLE when the RPC call never resolves within the timeout', async () => {
    jest.useFakeTimers();
    mockVerifyCertificate.mockReturnValueOnce(new Promise(() => {})); // never resolves
    const adapter = createChainAdapter({ network: 'ganache', signer: {} });

    const pending = adapter.verifyCertificate('0x' + 'f'.repeat(64));
    const assertion = expect(pending).rejects.toMatchObject({ code: 'E_CHAIN_UNAVAILABLE' });

    await jest.advanceTimersByTimeAsync(8001);
    await assertion;
    jest.useRealTimers();
  });
});
