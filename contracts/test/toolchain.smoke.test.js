// SPDX-License-Identifier: MIT
const { expect } = require('chai');
const hre = require('hardhat');

// TEMPORARY — proves the test toolchain (Hardhat + Chai/Mocha, against
// Ganache via `npm run ganache` + `--network ganache`, or Hardhat's own
// built-in network by default) works before any real contract exists.
// Delete alongside src/_ToolchainSmokeTest.sol once Week 3's real contract
// skeleton lands and has its own tests.
describe('Toolchain smoke test', () => {
  it('compiles, deploys, and reads/writes state', async () => {
    const Factory = await hre.ethers.getContractFactory('ToolchainSmokeTest');
    const instance = await Factory.deploy(42);
    await instance.waitForDeployment();

    expect(await instance.value()).to.equal(42n);

    const tx = await instance.setValue(7);
    await tx.wait();

    expect(await instance.value()).to.equal(7n);
  });
});
