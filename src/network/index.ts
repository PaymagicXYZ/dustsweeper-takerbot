import { ethers } from 'ethers'
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle'

import config from "../config"

const providerUrl = config.providerUrl
const privateKey = config.privateKey

export const provider = new ethers.providers.JsonRpcProvider(providerUrl)
export const wallet = new ethers.Wallet(privateKey as string, provider)

const flashBotsAuthSigner = new ethers.Wallet(
  config.flashbots.flashbotsAuthSignerPK as string,
);

// Flashbots provider requires passing in a standard provider and an auth signer
export const getFlashbotsProvider = async () => FlashbotsBundleProvider.create(
  provider as any,
  flashBotsAuthSigner
);
