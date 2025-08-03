import { useState, useEffect } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import TonWeb from 'tonweb';
import { Address, Cell } from 'ton-core';
import { Buffer } from 'buffer';
import { SWAP_CONTRACT } from './config';
import './App.css';

const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
const contract = Address.parse(SWAP_CONTRACT);

type JetConfig = {
  collection: Address;
  reward5: bigint;
  reward10: bigint;
  reward20: bigint;
};

export default function App() {
  const walletAddress = useTonAddress();
  const [balance, setBalance] = useState<string>('');
  const [config, setConfig] = useState<JetConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletAddress) {
      tonweb.provider.getBalance(walletAddress).then((b) => setBalance(b.toString()));
    }
  }, [walletAddress]);

  const loadState = async () => {
    try {
      setError(null);
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

  return (
    <div className="app-container">
      <h1>NFT ↔ TON Swapper</h1>
      <TonConnectButton />
      {walletAddress && (
        <p className="status">
          Connected: {walletAddress} (balance: {balance})
        </p>
      )}
      <button className="action" onClick={loadState}>Load contract state</button>
      {error && <p className="error">{error}</p>}
      {config && <pre className="config">{JSON.stringify(config, null, 2)}</pre>}
    </div>
  );
}
