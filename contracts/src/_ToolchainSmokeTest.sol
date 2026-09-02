// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

/// @notice TEMPORARY. Exists only to prove the Hardhat + Chai/Mocha + Ganache
/// toolchain actually compiles, deploys, and tests something end to end,
/// before Kartik's real contract skeleton exists (Week 3). Delete this file
/// once real contract tests replace `test/toolchain.smoke.test.js`.
contract ToolchainSmokeTest {
    uint256 public value;

    constructor(uint256 initialValue) {
        value = initialValue;
    }

    function setValue(uint256 newValue) external {
        value = newValue;
    }
}
