// SPDX-License-Identifier: MIT
const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

/**
 * Deploys SecureCredRegistry to the network selected via `--network <name>`
 * and records the resulting deployment (address + ABI + metadata) under
 * contracts/deployments/ — this is how the ABI gets published for whoever
 * consumes it next (the API's future chain adapter, not built yet).
 */
async function main() {
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying SecureCredRegistry to network "${network}" (chainId ${chainId}) from ${deployer.address}...`);

  const Registry = await hre.ethers.getContractFactory('SecureCredRegistry');
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`SecureCredRegistry deployed at ${address}`);

  const artifact = await hre.artifacts.readArtifact('SecureCredRegistry');

  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentRecord = {
    address,
    abi: artifact.abi,
    network,
    chainId,
    deployedAt: new Date().toISOString(),
    deployerAddress: deployer.address,
  };

  const outFile = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deploymentRecord, null, 2));
  console.log(`Deployment record written to ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
