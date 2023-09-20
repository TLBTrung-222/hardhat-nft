const { assert } = require("chai");
const { deployments, getNamedAccounts, ethers, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNft test", function () {
          // create the contract instance
          let BasicNft, deployer;

          beforeEach(async () => {
              await deployments.fixture(["all"]);
              BasicNft = await ethers.getContract("BasicNft");
              deployer = (await getNamedAccounts()).deployer;
          });

          describe("constructor", async () => {
              it("contract should initialized correctly", async () => {
                  const tokenCounter = await BasicNft.getTokenCounter();
                  assert.equal(tokenCounter, "0");
              });
          });

          describe("mintNft", async () => {
              beforeEach(async () => {
                  const txResponse = await BasicNft.mintNft();
                  await txResponse.wait(1);
              });
              it("Allows users to mint an NFT, and updates appropriately", async () => {
                  // update token URI and token counter
                  const tokenURI = await BasicNft.tokenURI("0");
                  const tokenCounter = await BasicNft.getTokenCounter();

                  assert.equal(tokenURI, await BasicNft.TOKEN_URI());
                  assert.equal(tokenCounter, "1");
              });

              it("Update the balance of miner and owner of minted NFT", async () => {
                  // using balanceOf method (from ERC721), we can check one address has how many NFT
                  const balanceOfMiner = await BasicNft.balanceOf(deployer);
                  assert.equal(balanceOfMiner, "1"); // miner after mint NFT should have one NFT

                  // using ownerOf method (from ERC721), we can check which NFT belong to which address
                  const owner = await BasicNft.ownerOf("0");
                  assert.equal(owner, deployer); // owner of NFT[0] should be miner
              });
          });
      });
