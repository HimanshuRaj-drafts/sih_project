import { ethers } from 'ethers';
import DocumentRegistryArtifact from '../contracts/DocumentRegistry.json';

const CONTRACT_ADDRESS = DocumentRegistryArtifact.address;
const CONTRACT_ABI = DocumentRegistryArtifact.abi;

const HARDHAT_NETWORK_ID = '0x7a69'; // 31337 in hex

/**
 * Request access to the user's MetaMask wallet and ensure they are on the correct network.
 * @returns {Promise<ethers.Signer>}
 */
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install it to interact with the blockchain.");
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  // Prompt user for account connections
  await provider.send("eth_requestAccounts", []);
  
  // Check and switch network if necessary
  const network = await provider.getNetwork();
  if (network.chainId !== 31337n) { // ethers v6 uses BigInt for chainId
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: HARDHAT_NETWORK_ID }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: HARDHAT_NETWORK_ID,
                chainName: 'Hardhat Localhost',
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          throw new Error("Failed to add Hardhat network to MetaMask.");
        }
      } else {
        throw new Error("Failed to switch to Hardhat network in MetaMask.");
      }
    }
    
    // Re-instantiate provider after network switch to ensure it picks up the new network
    // (Sometimes necessary in ethers v6)
  }

  // Use the window.ethereum provider again in case it was switched
  const updatedProvider = new ethers.BrowserProvider(window.ethereum);
  const signer = await updatedProvider.getSigner();
  return signer;
};

/**
 * Get an instance of the DocumentRegistry contract.
 * @param {ethers.Signer | ethers.Provider} signerOrProvider 
 * @returns {ethers.Contract}
 */
export const getContract = (signerOrProvider) => {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
};

/**
 * Register a document hash on the blockchain.
 * @param {string} hash - The SHA-256 hash (hex string).
 * @returns {Promise<string>} - The transaction hash.
 */
export const registerDocumentHash = async (hash) => {
  const signer = await connectWallet();
  const contract = getContract(signer);
  
  // Format hash to bytes32. If it's already a 64-char hex, add '0x'.
  // Ensure the hash is exactly 64 chars long (32 bytes)
  let bytes32Hash = hash.startsWith('0x') ? hash : `0x${hash}`;
  
  try {
    const tx = await contract.registerDocument(bytes32Hash);
    console.log("Transaction sent:", tx.hash);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    console.log("Transaction mined in block:", receipt.blockNumber);
    
    return receipt.hash;
  } catch (error) {
    console.error("Error registering document on blockchain:", error);
    throw error;
  }
};

/**
 * Verify a document hash on the blockchain.
 * @param {string} hash - The SHA-256 hash (hex string).
 * @returns {Promise<Object>} - The document metadata from the contract.
 */
export const verifyDocumentHash = async (hash) => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install it to interact with the blockchain.");
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contract = getContract(provider);
  
  const bytes32Hash = hash.startsWith('0x') ? hash : `0x${hash}`;
  
  try {
    const [uploader, timestamp, exists] = await contract.verifyDocument(bytes32Hash);
    return {
      uploader,
      timestamp: Number(timestamp) * 1000, // Convert to JS ms
      exists
    };
  } catch (error) {
    console.error("Error verifying document on blockchain:", error);
    throw error;
  }
};
