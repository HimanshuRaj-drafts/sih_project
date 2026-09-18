// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DocumentRegistry is Ownable {
    // Struct to hold metadata for a registered document hash
    struct Document {
        address uploader;
        uint256 timestamp;
        bool exists;
    }

    // Map a bytes32 hash to its Document record (bytes32 is massively cheaper/safer than string)
    mapping(bytes32 => Document) public documents;

    // Event emitted when a document is successfully registered
    event DocumentRegistered(bytes32 indexed documentHash, address indexed uploader, uint256 timestamp);

    /**
     * @dev Sets the deployer as the initial owner of the contract.
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Registers a new document hash on the blockchain.
     * @param _documentHash The bytes32 hash of the pristine document.
     */
    function registerDocument(bytes32 _documentHash) external onlyOwner {
        // Strictly block registration of duplicate hashes
        require(!documents[_documentHash].exists, "Document hash already exists in the registry");

        // Record the document details
        documents[_documentHash] = Document({
            uploader: msg.sender,
            timestamp: block.timestamp,
            exists: true
        });

        // Emit an event for the frontend and indexers
        emit DocumentRegistered(_documentHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Retrieves the stored data for a specific document hash for frontend validation.
     * @param _documentHash The bytes32 hash to query.
     * @return uploader The wallet address that registered the hash.
     * @return timestamp The exact block time the hash was registered.
     * @return exists Boolean indicating if the hash is registered.
     */
    function verifyDocument(bytes32 _documentHash) external view returns (address uploader, uint256 timestamp, bool exists) {
        Document memory doc = documents[_documentHash];
        return (doc.uploader, doc.timestamp, doc.exists);
    }
}
