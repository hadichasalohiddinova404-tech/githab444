// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract CreatorCollectiveNFT is ERC721URIStorage, ERC721Burnable, Ownable {
    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 deadline;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        bool exists;
    }

    uint256 private _tokenIds;
    uint256 private _proposalIds;

    uint256 public mintPrice;
    string public contractMetadataURI;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event NFTMinted(address indexed minter, uint256 indexed tokenId, string tokenURI);
    event ProposalCreated(uint256 indexed proposalId, string title, uint256 deadline);
    event ProposalVoted(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId, bool approved);
    event MintPriceUpdated(uint256 newMintPrice);
    event ContractMetadataUpdated(string metadataURI);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 mintPrice_,
        string memory metadataURI_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        mintPrice = mintPrice_;
        contractMetadataURI = metadataURI_;
    }

    modifier onlyTokenHolder() {
        require(balanceOf(msg.sender) > 0, "Only NFT holder can call");
        _;
    }

    function safeMint(address to, string memory tokenURI_) external payable returns (uint256) {
        require(msg.value >= mintPrice, "Insufficient mint fee");

        _tokenIds += 1;
        uint256 newTokenId = _tokenIds;

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);

        emit NFTMinted(to, newTokenId, tokenURI_);
        return newTokenId;
    }

    function createProposal(
        string memory title,
        string memory description,
        uint256 durationInSeconds
    ) external onlyTokenHolder returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(durationInSeconds >= 60, "Duration too short");

        _proposalIds += 1;
        uint256 proposalId = _proposalIds;

        proposals[proposalId] = Proposal({
            id: proposalId,
            title: title,
            description: description,
            deadline: block.timestamp + durationInSeconds,
            yesVotes: 0,
            noVotes: 0,
            executed: false,
            exists: true
        });

        emit ProposalCreated(proposalId, title, proposals[proposalId].deadline);
        return proposalId;
    }

    function voteOnProposal(uint256 proposalId, bool support) external onlyTokenHolder {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.exists, "Proposal not found");
        require(block.timestamp < proposal.deadline, "Voting closed");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.yesVotes += 1;
        } else {
            proposal.noVotes += 1;
        }

        emit ProposalVoted(proposalId, msg.sender, support);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.exists, "Proposal not found");
        require(block.timestamp >= proposal.deadline, "Voting still active");
        require(!proposal.executed, "Already executed");

        proposal.executed = true;
        emit ProposalExecuted(proposalId, proposal.yesVotes > proposal.noVotes);
    }

    function updateTokenURI(uint256 tokenId, string memory newTokenURI) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        _setTokenURI(tokenId, newTokenURI);
    }

    function updateMintPrice(uint256 newMintPrice) external onlyOwner {
        mintPrice = newMintPrice;
        emit MintPriceUpdated(newMintPrice);
    }

    function setContractMetadataURI(string memory metadataURI_) external onlyOwner {
        contractMetadataURI = metadataURI_;
        emit ContractMetadataUpdated(metadataURI_);
    }

    function totalMinted() external view returns (uint256) {
        return _tokenIds;
    }

    function totalProposals() external view returns (uint256) {
        return _proposalIds;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdraw failed");
    }
}


