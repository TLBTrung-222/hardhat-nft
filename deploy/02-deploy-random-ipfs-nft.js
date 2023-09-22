const { network, ethers } = require("hardhat");
const {
    developmentChains,
    networkConfig,
} = require("../helper-hardhat-config");

const MINT_FEE = ethers.utils.parseEther("0.01");
const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    const chainId = network.config.chainId;

    let subscriptionId, vrfCoordinatorV2Address;

    // 1. in case working local, need to deploy mock
    // - create mock solidity contract -> deploy ✅
    // 2.1 If we working with mock, Need to create subscription -> get subId -> fund it -> add consumer (our contract address)
    // 2.2 If not, just get information needed via UI
    // the point is to get the "subscription ID" to pass into constructor (to make request random words)

    // get the mock instance
    const vrfCoordinatorV2Mock = await ethers.getContract(
        "VRFCoordinatorV2Mock"
    );

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        // create subscription by mock
        // even though this function return a subId, but this func modify blockchain state
        // -> need to get subId from event
        const txResponse = await vrfCoordinatorV2Mock.createSubscription(); // this will emit an event so we can catch the subId
        const txReceipt = await txResponse.wait(1);
        subscriptionId = txReceipt.events[0].args.subId;
        // fund subcription (local network don't need LINK token as testnet, so we use ETH)
        // fundSubscription(uint64 _subId, uint96 _amount)
        await vrfCoordinatorV2Mock.fundSubscription(
            subscriptionId,
            VRF_SUB_FUND_AMOUNT
        );
    } else {
        subscriptionId = networkConfig[chainId]["subscriptionId"];
        vrfCoordinatorV2Address =
            networkConfig[chainId]["vrfCoordinatorAddress"];
    }

    const keyHash = networkConfig[chainId]["keyHash"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];

    const args = [
        vrfCoordinatorV2Address,
        keyHash,
        subscriptionId,
        callbackGasLimit,
        // we lack of dogTokenURIs for constructor
        MINT_FEE,
    ];
};

module.exports.tags = ["all", "randomNft"];
