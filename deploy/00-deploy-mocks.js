// deploy vrfCoordinator in local

const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

const BASE_FEE = ethers.utils.parseEther("0.25"); // 0.25 is this the premium in LINK?
const GAS_PRICE_LINK = 1e9; //link per gas, is this the gas lane? // 0.000000001 LINK per gas

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    // If we are on local, deploy mock contract
    if (developmentChains.includes(network.name)) {
        await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            // constructor(uint96 _baseFee, uint96 _gasPriceLink)
            args: [BASE_FEE, GAS_PRICE_LINK],
            log: true,
        });
    }
    log("Mocks Deployed!");
    log("----------------------------------------------------------------");
};

module.exports.tags = ["all", "mocks"];
