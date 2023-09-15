/** @type import('hardhat/config').HardhatUserConfig */
import "@nomicfoundation/hardhat-ethers";
import dotenv from 'dotenv'
dotenv.config()

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      }
    }
  }
};

