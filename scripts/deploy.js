const hre = require("hardhat");

async function main() {
  const mintPrice = hre.ethers.parseEther("0.005");
  const metadataURI = "ipfs://collection-metadata.json";

  const contractFactory = await hre.ethers.getContractFactory("CreatorCollectiveNFT");
  const contract = await contractFactory.deploy(
    "Husanboy",
    "CCNFT",
    mintPrice,
    metadataURI
  );

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("CreatorCollectiveNFT deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
