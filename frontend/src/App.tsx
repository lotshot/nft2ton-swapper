import { useState, useEffect } from 'react';
import { TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import TonWeb from 'tonweb';
import { Address, beginCell, Cell } from 'ton-core';
import { Buffer } from 'buffer';
import {
  SWAP_CONTRACT,
  NFT_CONTRACT,
  TONCENTER_URL,
  TON_API_URL,
} from './config';
import './App.css';

const tonweb = new TonWeb(new TonWeb.HttpProvider(TONCENTER_URL));
const OP_REDEEM = 0x72656465;

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
  const [nfts, setNfts] = useState<string[]>([]);
  const [count, setCount] = useState('1');

  useEffect(() => {
    if (walletAddress) {
      tonweb.provider.getBalance(walletAddress).then((b) => setBalance(b.toString()));
    }
  }, [walletAddress]);

  useEffect(() => {
    const fetchNfts = async () => {
      if (!walletAddress || !NFT_CONTRACT) return;
      try {
        const res = await fetch(
          `${TON_API_URL}/accounts/${walletAddress}/nfts?collection=${NFT_CONTRACT}`,
        );
        const data = await res.json();
        const items = (data.nft_items as { address: string }[] | undefined) ?? [];
        setNfts(items.map((i) => i.address));
      } catch (e) {
        console.error(e);
      }
    };
    fetchNfts();
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
      const cnt = parseInt(count);
      if (isNaN(cnt) || cnt <= 0) {
        throw new Error('Select amount of NFTs');
      }
      if (cnt > nfts.length) {
        throw new Error('Not enough NFTs');
      }
      const bodyBuilder = beginCell().storeUint(OP_REDEEM, 32).storeUint(cnt, 8);
      nfts.slice(0, cnt).forEach((addr) =>
        bodyBuilder.storeAddress(Address.parse(addr)),
      );
      const payload = bodyBuilder.endCell().toBoc().toString('base64');

      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 60,
        messages: [
          {
            address: SWAP_CONTRACT,
            amount: TonWeb.utils.toNano('0.05').toString(),
            payload,
          },
        ],
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
        <>
          <p className="status">
            Connected: {walletAddress} (balance: {balance})
          </p>
          <div className="nft-info">You have {nfts.length} NFTs available.</div>
          <div className="swap-form">
            <input
              type="number"
              min="1"
              max={nfts.length}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              disabled={nfts.length === 0}
            />
            <button className="action" onClick={swap} disabled={nfts.length === 0}>
              Swap
            </button>
          </div>
        </>
      )}
      <button className="action" onClick={loadState}>
        Load contract state
      </button>
      {error && <p className="error">{error}</p>}
      {config && <pre className="config">{JSON.stringify(config, null, 2)}</pre>}
    </div>
  );
}

