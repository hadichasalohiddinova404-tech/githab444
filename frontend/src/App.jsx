import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractAbi, contractAddress } from "./contract";

const initialMintForm = { recipient: "", tokenUri: "" };
const initialUpdateForm = { tokenId: "", tokenUri: "" };
const initialProposalForm = { title: "", description: "", duration: "3600" };

function formatAddress(address) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTimestamp(timestamp) {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

export default function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [status, setStatus] = useState("Walletni ulab, dApp bilan ishlashni boshlang.");
  const [stats, setStats] = useState({ mintPrice: "0", totalMinted: "0", totalProposals: "0", holderBalance: "0" });
  const [proposals, setProposals] = useState([]);
  const [mintForm, setMintForm] = useState(initialMintForm);
  const [updateForm, setUpdateForm] = useState(initialUpdateForm);
  const [proposalForm, setProposalForm] = useState(initialProposalForm);
  const [isBusy, setIsBusy] = useState(false);

  async function getEthereum() {
    if (!window.ethereum) {
      throw new Error("MetaMask topilmadi. Brauzerga wallet o'rnating.");
    }
    if (!contractAddress) {
      throw new Error("Frontend .env ichida VITE_CONTRACT_ADDRESS ko'rsatilmagan.");
    }
    return window.ethereum;
  }

  async function getContract(withSigner = false) {
    const ethereum = await getEthereum();
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = withSigner ? await provider.getSigner() : null;
    return new ethers.Contract(contractAddress, contractAbi, withSigner ? signer : provider);
  }

  async function loadData(activeAddress = walletAddress) {
    try {
      const contract = await getContract();
      const [mintPrice, totalMinted, totalProposals] = await Promise.all([
        contract.mintPrice(),
        contract.totalMinted(),
        contract.totalProposals(),
      ]);

      let holderBalance = 0n;
      if (activeAddress) {
        holderBalance = await contract.balanceOf(activeAddress);
      }

      const proposalCount = Number(totalProposals);
      const proposalEntries = await Promise.all(
        Array.from({ length: proposalCount }, async (_, index) => {
          const proposal = await contract.proposals(index + 1);
          return {
            id: proposal.id.toString(),
            title: proposal.title,
            description: proposal.description,
            deadline: proposal.deadline.toString(),
            yesVotes: proposal.yesVotes.toString(),
            noVotes: proposal.noVotes.toString(),
            executed: proposal.executed,
            exists: proposal.exists,
          };
        })
      );

      setStats({
        mintPrice: ethers.formatEther(mintPrice),
        totalMinted: totalMinted.toString(),
        totalProposals: totalProposals.toString(),
        holderBalance: holderBalance.toString(),
      });
      setProposals(proposalEntries.filter((proposal) => proposal.exists).reverse());
    } catch (error) {
      setStatus(error.message || "On-chain ma'lumotlarni yuklashda xatolik yuz berdi.");
    }
  }

  useEffect(() => {
    if (!window.ethereum) {
      return;
    }

    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (accounts[0]) {
        setWalletAddress(accounts[0]);
        loadData(accounts[0]);
      }
    });

    const handleAccountsChanged = (accounts) => {
      const nextAddress = accounts[0] || "";
      setWalletAddress(nextAddress);
      loadData(nextAddress);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  async function handleAction(action, successMessage) {
    try {
      setIsBusy(true);
      setStatus("Tranzaksiya yuborilmoqda...");
      await action();
      setStatus(successMessage);
      await loadData();
    } catch (error) {
      setStatus(error.reason || error.shortMessage || error.message || "Xatolik yuz berdi.");
    } finally {
      setIsBusy(false);
    }
  }

  async function connectWallet() {
    try {
      const ethereum = await getEthereum();
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddress(accounts[0] || "");
      setStatus("Wallet muvaffaqiyatli ulandi.");
      await loadData(accounts[0] || "");
    } catch (error) {
      setStatus(error.message || "Wallet ulanmadi.");
    }
  }

  async function mintNFT(event) {
    event.preventDefault();

    await handleAction(async () => {
      const contract = await getContract(true);
      const tx = await contract.safeMint(
        mintForm.recipient || walletAddress,
        mintForm.tokenUri,
        { value: ethers.parseEther(stats.mintPrice || "0") }
      );
      await tx.wait();
      setMintForm(initialMintForm);
    }, "NFT muvaffaqiyatli mint qilindi.");
  }

  async function updateMetadata(event) {
    event.preventDefault();

    await handleAction(async () => {
      const contract = await getContract(true);
      const tx = await contract.updateTokenURI(updateForm.tokenId, updateForm.tokenUri);
      await tx.wait();
      setUpdateForm(initialUpdateForm);
    }, "Token metadata yangilandi.");
  }

  async function createProposal(event) {
    event.preventDefault();

    await handleAction(async () => {
      const contract = await getContract(true);
      const tx = await contract.createProposal(
        proposalForm.title,
        proposalForm.description,
        Number(proposalForm.duration)
      );
      await tx.wait();
      setProposalForm(initialProposalForm);
    }, "Proposal yaratildi.");
  }

  async function vote(proposalId, support) {
    await handleAction(async () => {
      const contract = await getContract(true);
      const tx = await contract.voteOnProposal(proposalId, support);
      await tx.wait();
    }, support ? "Yes vote yuborildi." : "No vote yuborildi.");
  }

  async function executeProposal(proposalId) {
    await handleAction(async () => {
      const contract = await getContract(true);
      const tx = await contract.executeProposal(proposalId);
      await tx.wait();
    }, "Proposal execute qilindi.");
  }

  return (
    <div className="app-shell">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="grid-glow" />

      <header className="hero">
        <section className="hero-main">
          <p className="eyebrow">Creator Economy Operating Layer</p>
          <h1>Husanboy</h1>
          <p className="hero-copy">
            NFT mint, metadata boshqaruvi va hamjamiyat voting oqimini bir joyga yig'adigan Web3 workspace.
          </p>
          <div className="feature-strip">
            <span>Mint</span>
            <span>Metadata Control</span>
            <span>On-chain Voting</span>
          </div>
        </section>

        <aside className="hero-panel command-panel">
          <div className="wallet-row">
            <div>
              <p className="micro-label">Wallet</p>
              <span className="wallet-pill">{formatAddress(walletAddress)}</span>
            </div>
            <button className="primary-button" onClick={connectWallet} disabled={isBusy}>
              {walletAddress ? "Reconnect" : "Connect Wallet"}
            </button>
          </div>
          <div className="hero-mini-stats">
            <div>
              <span>Mint Price</span>
              <strong>{stats.mintPrice} ETH</strong>
            </div>
            <div>
              <span>Holder NFTs</span>
              <strong>{stats.holderBalance}</strong>
            </div>
          </div>
          <p className="status">{status}</p>
        </aside>
      </header>

      <section className="stats-grid">
        <article className="stat-card accent-card">
          <span>Mint narxi</span>
          <strong>{stats.mintPrice} ETH</strong>
        </article>
        <article className="stat-card">
          <span>Mint qilingan NFT</span>
          <strong>{stats.totalMinted}</strong>
        </article>
        <article className="stat-card">
          <span>Proposal soni</span>
          <strong>{stats.totalProposals}</strong>
        </article>
        <article className="stat-card">
          <span>Sizdagi NFT</span>
          <strong>{stats.holderBalance}</strong>
        </article>
      </section>

      <main className="content-grid">
        <section className="action-stack">
          <section className="panel feature-panel">
            <div className="panel-topline">
              <span className="panel-kicker">Drop Studio</span>
              <h2>Mint NFT</h2>
            </div>
            <form onSubmit={mintNFT}>
              <label>
                Recipient
                <input
                  value={mintForm.recipient}
                  onChange={(event) => setMintForm({ ...mintForm, recipient: event.target.value })}
                  placeholder="0x... bo'sh qoldirilsa o'zingizga mint"
                />
              </label>
              <label>
                Token URI
                <input
                  value={mintForm.tokenUri}
                  onChange={(event) => setMintForm({ ...mintForm, tokenUri: event.target.value })}
                  placeholder="ipfs://your-nft-metadata.json"
                  required
                />
              </label>
              <button type="submit" disabled={isBusy || !walletAddress}>
                Mint
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-topline">
              <span className="panel-kicker">Asset Control</span>
              <h2>Update Metadata</h2>
            </div>
            <form onSubmit={updateMetadata}>
              <label>
                Token ID
                <input
                  type="number"
                  value={updateForm.tokenId}
                  onChange={(event) => setUpdateForm({ ...updateForm, tokenId: event.target.value })}
                  required
                />
              </label>
              <label>
                New Token URI
                <input
                  value={updateForm.tokenUri}
                  onChange={(event) => setUpdateForm({ ...updateForm, tokenUri: event.target.value })}
                  placeholder="ipfs://updated.json"
                  required
                />
              </label>
              <button type="submit" disabled={isBusy || !walletAddress}>
                Update
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-topline">
              <span className="panel-kicker">Community Motion</span>
              <h2>Create Proposal</h2>
            </div>
            <form onSubmit={createProposal}>
              <label>
                Title
                <input
                  value={proposalForm.title}
                  onChange={(event) => setProposalForm({ ...proposalForm, title: event.target.value })}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  value={proposalForm.description}
                  onChange={(event) => setProposalForm({ ...proposalForm, description: event.target.value })}
                  rows="4"
                  required
                />
              </label>
              <label>
                Duration (seconds)
                <input
                  type="number"
                  min="60"
                  value={proposalForm.duration}
                  onChange={(event) => setProposalForm({ ...proposalForm, duration: event.target.value })}
                  required
                />
              </label>
              <button type="submit" disabled={isBusy || !walletAddress}>
                Publish Proposal
              </button>
            </form>
          </section>
        </section>

        <section className="panel proposals-panel governance-stage">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Governance Feed</span>
              <h2>Community Voting</h2>
            </div>
            <button type="button" className="secondary" onClick={() => loadData()}>
              Refresh
            </button>
          </div>

          <div className="proposal-list">
            {proposals.length === 0 ? (
              <div className="empty-state">Hali proposal yo'q. Birinchi governance taklifini yarating.</div>
            ) : (
              proposals.map((proposal) => {
                const isClosed = Date.now() >= Number(proposal.deadline) * 1000;

                return (
                  <article className="proposal-card" key={proposal.id}>
                    <div className="proposal-header">
                      <span className="proposal-id">#{proposal.id}</span>
                      <span className={proposal.executed ? "badge badge-muted" : "badge"}>
                        {proposal.executed ? "Executed" : isClosed ? "Ready to Execute" : "Open"}
                      </span>
                    </div>
                    <h3>{proposal.title}</h3>
                    <p>{proposal.description}</p>
                    <div className="vote-metrics">
                      <span>Yes: {proposal.yesVotes}</span>
                      <span>No: {proposal.noVotes}</span>
                    </div>
                    <small>Deadline: {formatTimestamp(proposal.deadline)}</small>
                    <div className="proposal-actions">
                      <button type="button" onClick={() => vote(proposal.id, true)} disabled={isBusy || !walletAddress || isClosed}>
                        Vote Yes
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => vote(proposal.id, false)}
                        disabled={isBusy || !walletAddress || isClosed}
                      >
                        Vote No
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => executeProposal(proposal.id)}
                        disabled={isBusy || !walletAddress || !isClosed || proposal.executed}
                      >
                        Execute
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
