const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DocumentRegistry", function () {
  let DocumentRegistry;
  let documentRegistry;
  let owner;
  let addr1;
  
  // Dummy SHA-256 hashes represented as standard bytes32 hex strings
  const testHash1 = "0x11a3e048a58d52065842813df65d4b4566a70e7e1f57e627341e3d9370007802";
  const testHash2 = "0xb94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";

  beforeEach(async function () {
    // Get test accounts
    [owner, addr1] = await ethers.getSigners();
    
    // Deploy a fresh contract before each test
    DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
    documentRegistry = await DocumentRegistry.deploy();
  });

  describe("Access Control", function () {
    it("Should allow the owner (Admin) to register a document", async function () {
      await expect(documentRegistry.registerDocument(testHash1)).to.not.be.reverted;
    });

    it("Should strictly reject registration attempts from unauthorized wallets", async function () {
      // Custom Error from OpenZeppelin Ownable starting from v5
      await expect(
        documentRegistry.connect(addr1).registerDocument(testHash1)
      ).to.be.revertedWithCustomError(documentRegistry, "OwnableUnauthorizedAccount")
        .withArgs(addr1.address);
    });
  });

  describe("Document Registration", function () {
    it("Should register a valid document hash successfully", async function () {
      // Register the hash
      await documentRegistry.registerDocument(testHash1);
      
      // Retrieve the document
      const doc = await documentRegistry.verifyDocument(testHash1);
      
      // Verify data is correct
      expect(doc.uploader).to.equal(owner.address);
      expect(doc.exists).to.equal(true);
      expect(doc.timestamp).to.be.above(0); // Ensure timestamp is set
    });

    it("Should emit a DocumentRegistered event on successful registration", async function () {
      // Execute the transaction
      const tx = await documentRegistry.registerDocument(testHash2);
      const receipt = await tx.wait();
      
      // Get the exact block timestamp that the transaction was mined in
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      // Assert the event was emitted with the correct arguments
      await expect(tx)
        .to.emit(documentRegistry, "DocumentRegistered")
        .withArgs(testHash2, owner.address, block.timestamp);
    });

    it("Should revert if trying to register a duplicate hash", async function () {
      // Register it the first time
      await documentRegistry.registerDocument(testHash1);
      
      // Attempt to register it again and expect an error
      await expect(
        documentRegistry.registerDocument(testHash1)
      ).to.be.revertedWith("Document hash already exists in the registry");
    });
  });
});
