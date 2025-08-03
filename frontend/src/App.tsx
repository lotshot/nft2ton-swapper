import { useState, useEffect } from 'react';
import { TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import TonWeb from 'tonweb';
import { Address, Cell } from 'ton-core';
import { Buffer } from 'buffer';
import { SWAP_CONTRACT } from './config';
import './App.css';

if (!window.Buffer) window.Buffer = Buffer;

const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));

type JetConfig = {
  collection: Address;
  reward5: bigint;
  reward10: bigint;
  reward20: bigint;
};

export default function App() {
  const walletAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [balance, setBalance] = useState<string>('');
  const [config, setConfig] = useState<JetConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [nftAddress, setNftAddress] = useState('');

  useEffect(() => {
    if (walletAddress) {
      tonweb.provider.getBalance(walletAddress).then((b) => setBalance(b.toString()));
    }
  }, [walletAddress]);

  const loadState = async () => {
    try {
      setError(null);
      if (!SWAP_CONTRACT) {
        throw new Error('SWAP_CONTRACT is not defined');
      }
      let contract: Address;
      try {
        contract = Address.parse(SWAP_CONTRACT);
      } catch {
        throw new Error('Invalid swap contract address');
      }
      const info = await tonweb.provider.getAddressInfo(contract.toString());
      const data = info.state?.data;
      if (!data) {
        throw new Error('No state found');
      }
      const boc = Buffer.from(TonWeb.utils.base64ToBytes(data));
      const cell = Cell.fromBoc(boc)[0];
      const cs = cell.beginParse();
      setConfig({
        collection: cs.loadAddress(),
        reward5: cs.loadCoins(),
        reward10: cs.loadCoins(),
        reward20: cs.loadCoins(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const swap = async () => {
    try {
      setError(null);
      if (!walletAddress) {
        throw new Error('Connect wallet first');
      }
      if (!SWAP_CONTRACT) {
        throw new Error('SWAP_CONTRACT is not defined');
      }
      if (!nftAddress) {
        throw new Error('NFT address is required');
      }
      try {
        Address.parse(nftAddress);
      } catch {
        throw new Error('Invalid NFT address');
      }
      const amountNano = TonWeb.utils.toNano(amount || '0');
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: [{ address: SWAP_CONTRACT, amount: amountNano.toString() }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="app-container">
      <h1>NFT ↔ TON Swapper</h1>
      <TonConnectButton />
      {walletAddress && (
        <p className="status">
          Connected: {walletAddress} (balance: {balance})
        </p>
      )}
      <div className="swap-form">
        <input
          placeholder="NFT address"
          value={nftAddress}
          onChange={(e) => setNftAddress(e.target.value)}
        />
        <input
          placeholder="TON amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className="action" onClick={swap}>Swap</button>
      </div>
      <button className="action" onClick={loadState}>Load contract state</button>
      {error && <p className="error">{error}</p>}
      {config && <pre className="config">{JSON.stringify(config, null, 2)}</pre>}
    </div>
  );
}
