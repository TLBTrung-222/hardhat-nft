const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIpfsNft", () => {
          // get the instance of mock and nft contract

          let randomIpfsNft, vrfCoordinatorV2Mock, deployer;

          beforeEach(async () => {
              await deployments.fixture(["mocks", "randomNft"]);
              randomIpfsNft = await ethers.getContract("RandomIpfsNft");
              vrfCoordinatorV2Mock = await ethers.getContract(
                  "VRFCoordinatorV2Mock"
              );
              deployer = (await getNamedAccounts()).deployer;
          });

          describe("constructor", async () => {
              it("the contract should initialized correctly", async () => {
                  // owner is deployer
                  const owner = await randomIpfsNft.getOwner();
                  assert.equal(owner, deployer);

                  // the fee should be 0.01 ETH
                  const mintFee = await randomIpfsNft.getMintFee();
                  assert.equal(
                      mintFee.toString(),
                      ethers.utils.parseEther("0.01").toString()
                  );
              });
          });

          describe("requestRandomNft", () => {
              let mintFee, requestId;
              beforeEach(async () => {
                  mintFee = await randomIpfsNft.getMintFee();
                  const txResponse = await randomIpfsNft.requestRandomNft({
                      value: mintFee,
                  });
                  const txReceipt = await txResponse.wait(1);
                  requestId = txReceipt.events[1].args.requestId;
              });

              it("revert when sending amount less than fee", async () => {
                  expect(randomIpfsNft.requestRandomNft()).to.be.reverted;
              });

              it("requestId should be 1", async () => {
                  assert.equal(requestId.toString(), "1");
              });
          });
          describe("fulfillRandomWords", function () {
              let mintFee;
              beforeEach(async () => {
                  mintFee = await randomIpfsNft.getMintFee();
              });

              it("balance of miner should > 1, owner of NFT should be miner", async () => {
                  // in testnet, we don't know when our transaction finished -> need to listen
                  await new Promise(async (resolve, reject) => {
                      console.log("Come to promise...");
                      randomIpfsNft.once("NftMinted", async () => {
                          try {
                              console.log("NftMinted event fired, testing...");
                              const tokenCounter =
                                  await randomIpfsNft.getTokenCounter();
                              assert.equal(tokenCounter.toString(), "1");

                              const numOfNft = await randomIpfsNft.balanceOf(
                                  deployer
                              );
                              assert.equal(numOfNft.toString(), "1");

                              const owner = await randomIpfsNft.ownerOf("0");
                              console.log(`Owner of first NFT: ${owner}`);
                              assert.equal(owner, deployer);

                              resolve();
                          } catch (e) {
                              console.log(e);
                              reject();
                          }
                      });

                      const txResponse = await randomIpfsNft.requestRandomNft({
                          value: mintFee.toString(),
                      });
                      const txReceipt = await txResponse.wait(1);
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          randomIpfsNft.address
                      );
                  });
              });
          });
      });
