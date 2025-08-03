import { useState, useEffect } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import TonWeb from 'tonweb';
import { TonClient } from 'ton';
import { Address } from 'ton-core';
import { readState } from '../../client/JetClient';
import type { JetConfig } from '../../client/JetClient';
import './App.css';

const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
const contract = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');

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
      const client = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });
      const state = await readState(client, contract);
      setConfig(state);
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
