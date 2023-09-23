const { network, ethers } = require("hardhat");
const {
    developmentChains,
    networkConfig,
} = require("../helper-hardhat-config");
const {
    testingPinataConnection,
    uploadImagess,
    uploadTokenURI,
} = require("../utils/uploadToPinata");
const { verify } = require("../utils/verify");

const imagesLocation = "./images/randomNft";

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
};

const MINT_FEE = ethers.utils.parseEther("0.01");
const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("10");

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    const chainId = network.config.chainId;

    let subscriptionId, vrfCoordinatorV2Address;

    let tokenURIs = [
        "ipfs://QmNYjxUUTBKGq1FFne26pAziYshMfaEGWMhb14szs7KRSQ",
        "ipfs://QmeseWgGSu3WjGCg27crfATHbU86yqqRB1cgjTzam8jhhR",
        "ipfs://QmbtwWzFdyidQkH8xbBt9AHRRcRJA61oGcJ3rcPmKW38MQ",
    ];

    // 1. in case working local, need to deploy mock
    // - create mock solidity contract -> deploy ✅
    // 2.1 If we working with mock, Need to create subscription -> get subId -> fund it -> add consumer (our contract address)
    // 2.2 If not, just get information needed via UI
    // the point is to get the "subscription ID" to pass into constructor (to make request random words)

    // get the mock instance
    const vrfCoordinatorV2Mock = await ethers.getContract(
        "VRFCoordinatorV2Mock"
    );

    // base on each chain, get vrf coordinator address and subID
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

    // create args
    const keyHash = networkConfig[chainId]["keyHash"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];

    if (process.env.UPLOAD_TO_PINATA == "TRUE") {
        console.log(
            "Check Pinata connection (return true mean the connection is okay)..."
        );
        await testingPinataConnection();
        tokenURIs = await handleTokenURIs();
    }

    const args = [
        vrfCoordinatorV2Address,
        keyHash,
        subscriptionId,
        callbackGasLimit,
        tokenURIs,
        MINT_FEE,
    ];

    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    console.log("randomIpfsNft contract deployed!!!");
    log("----------------------------------------------------------------");

    // verify the contract if we are on testnet
    if (!developmentChains.includes(network.name)) {
        log("Verifing...");
        await verify(randomIpfsNft.address, []);
    }
};

// This function will perform 2 things:
// 1. Upload our image to Pinata (it's just IPFS...)
// 2. Base on each uploaded image, create a metadata file
//      2.1 Upload that metadata to IPFS
// 3. Return all the metadata link (tokenURI) then continue to deploy

async function handleTokenURIs() {
    let tokenURIs = [];

    // 1. uploading images to Pinata
    const { responses: imageUploadedResponse, files } = await uploadImagess(
        imagesLocation
    );

    // 2. create metadata file base on each image
    console.log("Creating metadata file...");
    for (responseIndex in imageUploadedResponse) {
        let tokenURI = { ...metadataTemplate }; // copy the template then modify each attribute
        // modify the attribute
        tokenURI.name = files[responseIndex].replace(".png", "");
        tokenURI.description = `A very cute ${tokenURI.name} pub`;
        tokenURI.image = `ipfs://${imageUploadedResponse[responseIndex].IpfsHash}`;
        console.log(`Uploading ${tokenURI.name} metadata to Pinata...`);

        // 2.1 Upload that metadata to IPFS
        const metadataUploadedResponse = await uploadTokenURI(tokenURI);

        // 3. Get the metadata ipfs hash
        tokenURIs.push(`ipfs://${metadataUploadedResponse.IpfsHash}`);
    }

    console.log(`List of uploaded tokenURI:  `);
    console.table(tokenURIs);
    return tokenURIs;
}

module.exports.tags = ["all", "randomNft"];
