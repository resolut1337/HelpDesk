import { BrowserProvider, Contract, parseEther } from 'ethers'

const defaultContractAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
const contractAddress = import.meta.env.VITE_PREMIUM_CONTRACT_ADDRESS || defaultContractAddress
const priceEth = import.meta.env.VITE_PREMIUM_PRICE_ETH || '1'
const localChainIdHex = '0x7a69'
const localNetworkConfig = {
  chainId: localChainIdHex,
  chainName: 'Hardhat Localhost 8545',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['http://127.0.0.1:8545'],
}

const premiumAbi = [
  {
    inputs: [],
    name: 'buyPremiumStatus',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'hasPremiumStatus',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
]

function getErrorMessage(error) {
  if (!error) return 'Unknown blockchain error.'
  if (typeof error === 'string') return error

  const knownMessage =
    error.shortMessage ||
    error.reason ||
    error?.info?.error?.message ||
    error?.error?.message ||
    error?.data?.message ||
    error.message

  if (!knownMessage) {
    return 'Blockchain request failed.'
  }

  if (knownMessage.includes('User denied') || knownMessage.includes('rejected')) {
    return 'Transaction was rejected in wallet.'
  }

  return knownMessage
}

function getEthereum() {
  if (typeof window === 'undefined') return null
  return window.ethereum ?? null
}

async function ensureLocalNetwork() {
  const ethereum = getEthereum()
  if (!ethereum?.request) {
    return
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: localChainIdHex }],
    })
  } catch (switchError) {
    if (switchError?.code !== 4902) {
      throw switchError
    }

    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [localNetworkConfig],
    })
  }
}

async function getProvider() {
  const ethereum = getEthereum()
  if (!ethereum) {
    throw new Error('MetaMask is not installed.')
  }
  return new BrowserProvider(ethereum)
}

export function isWalletAvailable() {
  return Boolean(getEthereum())
}

export async function getConnectedWalletAddress() {
  try {
    const provider = await getProvider()
    const accounts = await provider.send('eth_accounts', [])
    const address = Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : ''
    return { ok: true, address }
  } catch (error) {
    return { ok: false, address: '', error: getErrorMessage(error) }
  }
}

export async function connectWallet() {
  try {
    await ensureLocalNetwork()
    const provider = await getProvider()
    const accounts = await provider.send('eth_requestAccounts', [])
    const address = Array.isArray(accounts) && accounts.length > 0 ? accounts[0] : ''

    if (!address) {
      return { ok: false, address: '', error: 'Wallet connection failed: no account returned.' }
    }

    return { ok: true, address }
  } catch (error) {
    return { ok: false, address: '', error: getErrorMessage(error) }
  }
}

async function getReadContract() {
  await ensureLocalNetwork()
  const provider = await getProvider()
  return new Contract(contractAddress, premiumAbi, provider)
}

async function getWriteContract() {
  await ensureLocalNetwork()
  const provider = await getProvider()
  const signer = await provider.getSigner()
  const address = await signer.getAddress()
  const contract = new Contract(contractAddress, premiumAbi, signer)
  return { contract, address }
}

export async function getPremiumStatus(walletAddress = '') {
  try {
    const addressResult = walletAddress
      ? { ok: true, address: walletAddress }
      : await getConnectedWalletAddress()

    if (!addressResult.ok) {
      return { ok: false, address: '', isPremium: false, error: addressResult.error }
    }

    if (!addressResult.address) {
      return { ok: true, address: '', isPremium: false }
    }

    const contract = await getReadContract()
    const status = await contract.hasPremiumStatus(addressResult.address)
    return { ok: true, address: addressResult.address, isPremium: Boolean(status) }
  } catch (error) {
    return { ok: false, address: '', isPremium: false, error: getErrorMessage(error) }
  }
}

export async function buyPremiumStatus() {
  try {
    const { contract, address } = await getWriteContract()

    const tx = await contract.buyPremiumStatus({
      value: parseEther(priceEth),
    })
    const receipt = await tx.wait()

    if (!receipt || Number(receipt.status) !== 1) {
      return { ok: false, address, error: 'Transaction failed on-chain.' }
    }

    return { ok: true, address, txHash: tx.hash }
  } catch (error) {
    return { ok: false, address: '', error: getErrorMessage(error) }
  }
}

export const premiumConfig = {
  contractAddress,
  priceEth,
  chainId: localChainIdHex,
  rpcUrl: localNetworkConfig.rpcUrls[0],
}
