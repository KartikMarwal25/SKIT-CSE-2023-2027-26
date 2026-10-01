import { describe, it, expect, jest } from '@jest/globals';

/**
 * Integration pass against Kartik's contract stubs — mocked, not a real
 * network call. Confirms this adapter calls issueCertificate on an
 * ethers.Contract instance built from the exact address/ABI shape Kartik's
 * Week 8 deploy script writes to contracts/deployments/<network>.json, with
 * the arguments in the order the real contract expects.
 */
const mockIssueCertificate = jest.fn().mockResolvedValue({ hash: '0xabc123' });
const MockContract = jest.fn().mockImplementation(() => ({
  issueCertificate: mockIssueCertificate,
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
