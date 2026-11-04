// SPDX-License-Identifier: MIT
require('@nomicfoundation/hardhat-toolbox');

// Load repo-root .env so a single set of secrets (AMOY_RPC_URL,
// CUSTODIAN_PRIVATE_KEY, ...) can be shared across the monorepo. This file
// is intentionally defensive: contracts/ must still compile and test with
// zero network secrets configured.
try {
  require('dotenv').config({ path: '../.env' });
} catch (err) {
  // dotenv not installed or .env missing — fall back to whatever is already in process.env.
}

const AMOY_RPC_URL = process.env.AMOY_RPC_URL || '';
const CUSTODIAN_PRIVATE_KEY = process.env.CUSTODIAN_PRIVATE_KEY || '';

// Only provide an accounts array when a real private key is configured;
// otherwise leave it empty so `hardhat compile` / `hardhat test` never fail
// on missing secrets (nothing in this repo has a real, funded testnet
// wallet yet — see docs/deployment/polygon-amoy-checklist.md).
const remoteAccounts = CUSTODIAN_PRIVATE_KEY ? [CUSTODIAN_PRIVATE_KEY] : [];

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  paths: {
    sources: './src',
  },
  solidity: {
    version: '0.8.36',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    // A local Ganache instance (npm run ganache), separate from Hardhat's
    // own built-in network — used throughout Sprints 2-3.
    ganache: {
      url: 'http://127.0.0.1:7545',
      chainId: 1337,
    },
    // Polygon's public testnet. Public RPC as the default so `hardhat
    // compile`/anyone without a paid RPC provider can still resolve this
    // network entry; AMOY_RPC_URL overrides it for anyone with their own
    // (Alchemy/Infura/etc.) endpoint, which real deployments should use —
    // the public RPC is not reliable enough for anything but occasional use.
    amoy: {
      url: AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
      chainId: 80002,
      accounts: remoteAccounts,
    },
  },
};
