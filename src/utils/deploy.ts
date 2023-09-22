const { ethers } = require("hardhat");

async function deploy() {
  // Load the contract's artifacts
  const TakerBot = await ethers.getContractFactory("TakerBot");
  
  // Deploy the contract
  const takerBot = await TakerBot.deploy();

  // Wait for the contract to be mined
  await takerBot.deployed();

  console.log("TakerBot deployed to:", takerBot.address);
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
