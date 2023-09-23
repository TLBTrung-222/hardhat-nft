// Use the api keys by providing the strings directly
const pinataSDK = require("@pinata/sdk");
const pinata = new pinataSDK(
    process.env.PINATA_API_KEY,
    process.env.PINATA_API_SECRET
);
const fs = require("fs");
const path = require("path");

async function testingPinataConnection() {
    await pinata
        .testAuthentication()
        .then((result) => {
            //handle successful authentication here
            console.log(result);
        })
        .catch((err) => {
            //handle error here
            console.log(err);
        });
}

// this function will upload each image to Pinata
async function uploadImagess(imagesFilePath) {
    // we need to loop through each image -> get the path to each one -> convert it into readableStream -> put into pinFileToIPFS
    // 1. Need to get the whole images array (to loop)
    // 2. For each images, need to create a readableStream
    // 3. Call pinFileToIPFS for each readablaStream

    // create an absolute file path to get the image arrays
    const fullImagesPath = path.resolve(imagesFilePath);
    const files = fs.readdirSync(fullImagesPath);

    let responses = []; // we need to get information about the uploaded image

    // Loop thourgh each file
    console.log("Uploading images to Pinata...");
    for (fileIndex in files) {
        // create a readable stream for each file
        console.log(`Uploading ${files[fileIndex]}...`);
        const filePath = path.resolve(fullImagesPath, files[fileIndex]);
        const readableStreamForFile = fs.createReadStream(filePath);
        try {
            // pinFileToIPFS syntax: pinata.pinFileToIPFS(readableStream, options) -> return a response object
            const response = await pinata.pinFileToIPFS(readableStreamForFile);
            responses.push(response);
        } catch (e) {
            console.log(e);
        }
    }
    console.log("All NFT image has been uploaded!!!");
    return { responses, files };
}

// this function will upload the metadata file to Pinata
async function uploadTokenURI(metadata) {
    try {
        const response = await pinata.pinJSONToIPFS(metadata);
        return response;
    } catch (e) {
        console.log(e);
    }
    return null;
}

module.exports = { testingPinataConnection, uploadImagess, uploadTokenURI };
