import { compile } from '@ton-community/blueprint';
import { Address, beginCell, contractAddress, internal, toNano, TonClient, WalletContractV4 } from 'ton';
import { mnemonicToWalletKey } from 'ton-crypto';

async function main() {
  const seed = process.env.SEED;
  const collection = process.env.COLLECTION_ADDRESS;
  const reward5 = process.env.REWARD5 || '0';
  const reward10 = process.env.REWARD10 || '0';
  const reward20 = process.env.REWARD20 || '0';

  if (!seed || !collection) {
    throw new Error('Environment variables SEED and COLLECTION_ADDRESS must be provided');
  }

  const endpoint = process.env.TON_ENDPOINT ?? 'https://testnet.toncenter.com/api/v2/jsonRPC';
  const apiKey = process.env.TON_API_KEY;
  const client = new TonClient({ endpoint, apiKey });

  const key = await mnemonicToWalletKey(seed.split(' '));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
  const walletContract = client.open(wallet);

  const code = await compile('contracts/jet.fc');

  const data = beginCell()
    .storeAddress(Address.parse(collection))
    .storeCoins(toNano(reward5))
    .storeCoins(toNano(reward10))
    .storeCoins(toNano(reward20))
    .endCell();

  const init = { code, data };
  const address = contractAddress(0, init);

  const seqno = await walletContract.getSeqno();

  await walletContract.sendTransfer({
    secretKey: key.secretKey,
    seqno,
    messages: [
      internal({
        to: address,
        value: toNano('0.05'),
        bounce: false,
        init,
      }),
    ],
  });

  console.log(`Deploy request sent to ${address.toString()}`);
}

main();
