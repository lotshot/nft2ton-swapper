import { useState, useEffect } from 'react';
import { TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import TonWeb from 'tonweb';
import { Address, beginCell } from 'ton-core';
import { SWAP_CONTRACT, NFT_CONTRACT, TON_API_URL } from '../config';
const OP_REDEEM = 0x72656465;

const SWAP_OPTIONS = [
  { nfts: 5, reward: '0.3' },
  { nfts: 10, reward: '1' },
  { nfts: 20, reward: '2.5' },
];

export default function SwapperLanding() {
  const walletAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [nfts, setNfts] = useState<string[]>([]);
  const [selected, setSelected] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNfts = async () => {
      if (!walletAddress || !NFT_CONTRACT) {
        setNfts([]);
        return;
      }
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

  const swap = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!walletAddress) {
        throw new Error('Connect wallet first');
      }
      if (!SWAP_CONTRACT) {
        throw new Error('SWAP_CONTRACT is not defined');
      }
      if (selected > nfts.length) {
        throw new Error('Not enough NFTs');
      }
      const bodyBuilder = beginCell().storeUint(OP_REDEEM, 32).storeUint(selected, 8);
      nfts.slice(0, selected).forEach((addr) =>
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
    } finally {
      setLoading(false);
    }
  };

  const selectedOption = SWAP_OPTIONS.find((o) => o.nfts === selected);
  const canSwap = nfts.length >= selected && !loading;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade">
        <h1 className="text-4xl md:text-5xl font-bold">NFT ↔ TON Swapper</h1>
        <p className="text-gray-300">
          Exchange unused NFTs for TON. Batch swap supported.
        </p>
        <div className="flex justify-center">
          <TonConnectButton />
        </div>
        {walletAddress && (
          <div className="space-y-4">
            <p className="text-sm text-gray-200">
              Eligible NFTs: {nfts.length}
            </p>
            <div className="flex justify-center gap-3">
              {SWAP_OPTIONS.map((opt) => (
                <button
                  key={opt.nfts}
                  onClick={() => setSelected(opt.nfts)}
                  className={`px-4 py-2 rounded-full border border-gray-600 transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-300 ${selected === opt.nfts ? 'bg-gray-700' : 'bg-transparent'}`}
                >
                  {opt.nfts} NFTs
                </button>
              ))}
            </div>
            <button
              onClick={swap}
              disabled={!canSwap}
              className="primary-glow px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Swap for {selectedOption?.reward} TON
            </button>
            {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}
          </div>
        )}
        <p className="text-yellow-400 text-sm">⚠️ You are using the testnet version.</p>
        <div className="flex items-center justify-center space-x-1 text-sm text-gray-400">
          <span>Audited by</span>
          <span className="font-semibold text-white">CertiK</span>
        </div>
        <a
          href="https://ton.lotshot.io"
          className="text-blue-400 hover:underline text-sm"
        >
          ← Back to ton.lotshot.io
        </a>
      </div>
    </div>
  );
}
