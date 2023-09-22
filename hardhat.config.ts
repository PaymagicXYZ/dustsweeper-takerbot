/** @type import('hardhat/config').HardhatUserConfig */
import "@nomicfoundation/hardhat-ethers";
import * as tdly from "@tenderly/hardhat-tenderly";
import dotenv from 'dotenv'

dotenv.config()
tdly.setup();

module.exports = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      forking: {
        url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      },
      chainId: 1,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PK],
    },
  },
  tenderly: {
    project: "takerbot",
    username: "evzhen",
    privateVerification: true,
  },
};

