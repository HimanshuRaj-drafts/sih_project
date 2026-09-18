require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Fail-closed security configuration
if (!PRIVATE_KEY || PRIVATE_KEY === "YOUR_METAMASK_PRIVATE_KEY_HERE") {
  // If the key is missing or dummy, strictly block deployment to any real networks
  if (process.env.HARDHAT_NETWORK && process.env.HARDHAT_NETWORK !== "hardhat" && process.env.HARDHAT_NETWORK !== "localhost") {
    throw new Error("CRITICAL SECURITY: A valid PRIVATE_KEY in .env is required for deployment to real networks.");
  }
}

// Fallback key ONLY for local hardhat testing to prevent crashes
const SAFE_PRIVATE_KEY = PRIVATE_KEY && PRIVATE_KEY !== "YOUR_METAMASK_PRIVATE_KEY_HERE"
  ? PRIVATE_KEY
  : "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

module.exports = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/",
      accounts: [SAFE_PRIVATE_KEY],
      chainId: 80002
    }
  }
};
