import { expect } from 'chai'
import { Contract, Signer } from "ethers";
import { ethers } from 'hardhat'

import { prepareExecute } from '../src/prepareForExecution'
import { monitorAvailableOrders } from '../src/monitor'
import { GroupedCallDataT, PreparedCallDataT } from '../src/types';

describe("TakerBot contract", async function () {

  let owner: Signer;
  let futureOwner: Signer;
  let takerBot: Contract;

  beforeEach(async function () {
    [owner, futureOwner] = await ethers.getSigners();

    const TakerBot = await ethers.getContractFactory("TakerBot");
    takerBot = await TakerBot.connect(owner).deploy()
  });

  it("should commit ownership transfer", async function () {
    takerBot.connect(owner).commitOwnershipTransfer(await futureOwner.getAddress())

    expect(await takerBot.futureOwner()).to.equal(await futureOwner.getAddress());
  });

  it("should accept ownership transfer", async function () {
    await takerBot.connect(owner).commitOwnershipTransfer(await futureOwner.getAddress());

    takerBot.connect(futureOwner).acceptOwnershipTransfer()

    expect(await takerBot.owner()).to.equal(await futureOwner.getAddress());
  });

  it("should payout ETH to owner", async function () {
    
    await owner.sendTransaction({
      to: takerBot.address,
      value: ethers.utils.parseEther("1.0"),
    });
    
    await takerBot.connect(owner).commitOwnershipTransfer(await futureOwner.getAddress());
    
    takerBot.connect(futureOwner).acceptOwnershipTransfer()
    
    const initialBalance = await futureOwner.getBalance();
    
    await takerBot.connect(futureOwner).payoutEth();

    const finalBalance = await futureOwner.getBalance();

    expect(BigInt(finalBalance) > BigInt(initialBalance)).to.be.true;
  });



  it("Deploy and execute sweep", async function () {
    this.timeout(10 * 60000)
    let succesfulCount = 0
    const [owner] = await ethers.getSigners();

    const feeData = await ethers.provider.getFeeData()

    await takerBot.deployed();
    const latestBlock = await ethers.provider.getBlockNumber()
    // monitor
    const tokenAddressesWithMakers = await monitorAvailableOrders(0, latestBlock - 224688, 3)
    
    // prepare calldata
    const preparedCallData = (await prepareExecute(tokenAddressesWithMakers, takerBot.address, owner.address)).map((preparedData: PreparedCallDataT) => ({
      ...preparedData,
      uniqueTokenAddresses: [preparedData.tokenAddressesForSC[0]],
      swapData: [preparedData.swapData],
    })) as GroupedCallDataT[]

    // group smaller chunks
    const groupedPreparedCallData = preparedCallData.reduce((result, currentElement) => {
      const lastIndex = result.length - 1;
    
      if (
        lastIndex >= 0 &&
        result[lastIndex].makersForSC.length + currentElement.makersForSC.length < 5
      ) {
        // Merge the elements
        result[lastIndex].makersForSC.push(...currentElement.makersForSC);
        result[lastIndex].tokenAddressesForSC.push(...currentElement.tokenAddressesForSC);
        result[lastIndex].value = String(
          BigInt(result[lastIndex].value) + BigInt(currentElement.value)
        );
        result[lastIndex].swapData.push(...currentElement.swapData);
        result[lastIndex].uniqueTokenAddresses.push(...currentElement.uniqueTokenAddresses);
        result[lastIndex].estimatedSwapReturn = String(
          BigInt(result[lastIndex].estimatedSwapReturn) + BigInt(currentElement.estimatedSwapReturn)
        );
      } else {
        // Add the current element as-is
        result.push(currentElement);
      }
    
      return result;
    }, [] as GroupedCallDataT[]);

    // execute
    for (const groupedPreparedData of groupedPreparedCallData) {
      try {
        console.log('makers length: ', groupedPreparedData.makersForSC.length)
        const value = BigInt(groupedPreparedData.value) + 100n
        const gasEstimate = await takerBot.estimateGas.runSweep(
          groupedPreparedData.makersForSC,
          groupedPreparedData.tokenAddressesForSC,
          groupedPreparedData.packet,
          groupedPreparedData.uniqueTokenAddresses,
          groupedPreparedData.swapData,
          {
            value
          }
        )
        const estimatedReturn = BigInt(groupedPreparedData.estimatedSwapReturn)
        if (feeData.gasPrice && (estimatedReturn - value < gasEstimate * feeData.gasPrice )) {
          console.log('gas is larger than profit, not executing')
          console.log('profit: ', estimatedReturn - value)
          console.log('gas: ', gasEstimate * feeData.gasPrice)
        } else {
          const sweepTx = await takerBot.connect(owner).runSweep(
            groupedPreparedData.makersForSC,
            groupedPreparedData.tokenAddressesForSC,
            groupedPreparedData.packet,
            groupedPreparedData.uniqueTokenAddresses,
            groupedPreparedData.swapData,
            {
              value
            }
          )
    
          const sweepReceipt = await sweepTx.wait();
          console.log("dustSweep txHash: " + sweepReceipt.transactionHash);
          await takerBot.connect(owner).payoutEth()
          succesfulCount++


          // if something left on contract, send it back to owner
          const dustSweeperBalance = await ethers.provider.getBalance(takerBot.address)
          if (dustSweeperBalance > 0n) {
            console.log('dustSweeperBalance: ', dustSweeperBalance)
            await takerBot.connect(owner).payoutEth()
          }
        }
      } catch (e) {
        console.error(e.message)
      }
    }

    console.log('succesfulCount: ', succesfulCount)
  });
});
