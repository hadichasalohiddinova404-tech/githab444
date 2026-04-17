export const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || "";

export const contractAbi = [
  "function mintPrice() view returns (uint256)",
  "function totalMinted() view returns (uint256)",
  "function totalProposals() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function safeMint(address to, string tokenURI_) payable returns (uint256)",
  "function updateTokenURI(uint256 tokenId, string newTokenURI)",
  "function createProposal(string title, string description, uint256 durationInSeconds) returns (uint256)",
  "function voteOnProposal(uint256 proposalId, bool support)",
  "function executeProposal(uint256 proposalId)",
  "function proposals(uint256) view returns (uint256 id, string title, string description, uint256 deadline, uint256 yesVotes, uint256 noVotes, bool executed, bool exists)"
];
