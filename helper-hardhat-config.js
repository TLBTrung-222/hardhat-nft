const { ethers } = require("hardhat");

const networkConfig = {
    31337: {
        name: "localhost",
    },
    // VRF contract Address, values can be obtained at https://docs.chain.link/vrf/v2/subscription/supported-networks#sepolia-testnet
    11155111: {
        name: "sepolia",
    },
};

const developmentChains = ["localhost", "hardhat"];

module.exports = {
    networkConfig,
    developmentChains,
};
