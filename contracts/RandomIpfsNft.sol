// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

error RandomIpfsNft__RangeOutOfBounds();
error RandomIpfsNft__NotEnoughFee();
error RandomIpfsNft__NotOwner();
error RandomIpfsNft__WithdrawFailed();

contract RandomIpfsNft is VRFConsumerBaseV2, ERC721URIStorage {
    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }

    address private immutable i_owner;

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private i_keyHash;
    uint64 private i_subscriptionId;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private i_callbackGasLimit;
    uint32 private NUM_WORDS = 1;

    // base on requestId -> find out the caller
    mapping(uint256 => address) public s_requestIdToCaller;

    // still need a token counter
    uint256 private s_tokenCounter;

    // list of tokenURI
    string[] internal s_dogTokenURIs;

    uint256 private immutable i_mintFee;

    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    modifier onlyOwner() {
        if (msg.sender != i_owner) {
            revert RandomIpfsNft__NotOwner();
        }
        _;
    }

    constructor(
        address _vrfCoordinator,
        bytes32 keyHash,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        string[3] memory dogTokenURIs,
        uint256 mintFee
    ) VRFConsumerBaseV2(_vrfCoordinator) ERC721("Random IPFS NFT", "RIN") {
        // create a VRF coordinator instance
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        // fill in parameter for requestRandomWords function
        i_keyHash = keyHash;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        // assign IPFS token URI list
        s_dogTokenURIs = dogTokenURIs;

        i_mintFee = mintFee;
        i_owner = msg.sender;
    }

    function requestRandomNft() public payable returns (uint256) {
        if (msg.value < i_mintFee) {
            revert RandomIpfsNft__NotEnoughFee();
        }

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash, // the maximum gas fee we willing to pay
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        // add requestId + caller to the mapping, so we can know who call this function
        s_requestIdToCaller[requestId] = msg.sender;

        // emit an event with requestId
        emit NftRequested(requestId, msg.sender);
        return requestId;
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        // get the address (caller) to send the NFT to
        address nftOwner = s_requestIdToCaller[requestId];

        // choose the appropriate dog breed from that random number
        uint256 moddedRng = randomWords[0] % 100;
        Breed dogBreed = getBreedFromModdedRng(moddedRng);

        // send NFT to caller
        _safeMint(nftOwner, s_tokenCounter);
        _setTokenURI(s_tokenCounter, s_dogTokenURIs[uint256(dogBreed)]);
        emit NftMinted(dogBreed, nftOwner);
    }

    //* After having a random number between 0 -> 99, choose the appropriate breed
    function getBreedFromModdedRng(
        uint256 moddedRng
    ) public pure returns (Breed) {
        uint256[3] memory chanceArray = [10, 30, uint256(100)]; // type case one element to uint256 to match chanceArray type

        // to avoid hardcode, we will check the number is in which range
        for (uint256 i = 0; i < chanceArray.length; i++) {
            uint256 startRange = 0;
            if (startRange <= moddedRng && moddedRng < chanceArray[i]) {
                return Breed(i);
            }
            startRange = chanceArray[i];
        }
        // if for some reason the function doesn't return anything, we will throw an error
        revert RandomIpfsNft__RangeOutOfBounds();
    }

    function withdraw() public payable onlyOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");

        if (!success) {
            revert RandomIpfsNft__WithdrawFailed();
        }
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getTokenURI(uint256 index) public view returns (string memory) {
        return s_dogTokenURIs[index];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
