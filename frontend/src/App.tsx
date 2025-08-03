import { useState, useEffect } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import TonWeb from 'tonweb';
import { TonClient } from 'ton';
import { Address } from 'ton-core';
import { readState } from '../../client/JetClient';
import type { JetConfig } from '../../client/JetClient';

const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));
const contract = Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');

export default function App() {
  const walletAddress = useTonAddress();
  const [balance, setBalance] = useState<string>('');
  const [config, setConfig] = useState<JetConfig | null>(null);

  useEffect(() => {
    if (walletAddress) {
      tonweb.provider.getBalance(walletAddress).then((b) => setBalance(b.toString()));
    }
  }, [walletAddress]);

  const loadState = async () => {
    const client = new TonClient({ endpoint: 'https://toncenter.com/api/v2/jsonRPC' });
    const state = await readState(client, contract);
    setConfig(state);
  };

  return (
    <div>
      <TonConnectButton />
      {walletAddress && (
        <p>
          Connected: {walletAddress} (balance: {balance})
        </p>
      )}
      <button onClick={loadState}>Load contract state</button>
      {config && <pre>{JSON.stringify(config, null, 2)}</pre>}
    </div>
  );
}
