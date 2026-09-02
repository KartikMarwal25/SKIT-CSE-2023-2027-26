// SPDX-License-Identifier: MIT
require('@nomicfoundation/hardhat-toolbox');

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
    // own built-in network — this week's task specifically. Deterministic
    // mode (see the "ganache" script in package.json) gives every developer
    // the same funded accounts.
    ganache: {
      url: 'http://127.0.0.1:7545',
      chainId: 1337,
    },
  },
};
