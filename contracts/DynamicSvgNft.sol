// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "base64-sol/base64.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract DynamicSvgNft is ERC721 {
    uint256 private s_tokenCounter;
    string private s_lowImageURI;
    string private s_highImageURI;
    AggregatorV3Interface private immutable i_priceFeed;

    // keep track high value of each NFT (tokenId -> highValue)
    mapping(uint256 => int256) private s_tokenIdToHighValue;

    event CreatedNFT(uint256 indexed tokenId, int256 highValue);

    constructor(
        string memory lowSvg,
        string memory highSvg,
        address priceFeedAddress
    ) ERC721("Dynamic SVG NFT", "DSN") {
        s_tokenCounter = 0;
        s_lowImageURI = svgToImageURI(lowSvg);
        s_highImageURI = svgToImageURI(highSvg);
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    // convert svg to base64 string, then get the imageURI = base64Prefix + base64Hash
    function svgToImageURI(
        string memory svg
    ) public pure returns (string memory) {
        // convert svg code -> base64 format
        string memory svgBase64Encoded = Base64.encode(
            bytes(string(abi.encodePacked(svg)))
        );
        string memory baseURI = "data:image/svg+xml;base64,";

        // combine with prefix, return the whole link as imageURI
        return string(abi.encodePacked(baseURI, svgBase64Encoded)); // we just concatenate strings here
    }

    //* mint new NFT
    function mintNft(int256 highValue) public {
        s_tokenIdToHighValue[s_tokenCounter] = highValue;
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter += 1;

        emit CreatedNFT(s_tokenCounter, highValue);
    }

    //* create tokenURI
    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        // check the tokenId if exist
        require(_exists(tokenId), "URI query for nonexist token");

        string memory imageURI = s_lowImageURI; // set default is frown image

        // get price of ETH

        (, int256 ethPrice, , , ) = i_priceFeed.latestRoundData();

        // checking high value condition
        if (s_tokenIdToHighValue[tokenId] > ethPrice) {
            imageURI = s_highImageURI;
        }

        // create metadata content and hash to base64 format
        // then combine with baseURI (json file) to create a tokenURI like this:
        // "data:application/json;base64,<base64hash>"
        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name(), // You can add whatever name here
                                '", "description":"An NFT that changes based on the Chainlink Feed", ',
                                '"attributes": [{"trait_type": "coolness", "value": 100}], "image":"',
                                imageURI,
                                '"}'
                            )
                        )
                    )
                )
            );
    }
}
