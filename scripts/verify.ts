import { Address, TonClient, beginCell } from 'ton';
import { sign, sha256_sync } from 'ton-crypto';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: ts-node scripts/verify.ts <owner> <nft1> [nft2 ...]');
    return;
  }

  const owner = args[0];
  const nfts = args.slice(1);
  const collection = process.env.COLLECTION_ADDRESS;
  const secretKey = process.env.SERVICE_SECRET_KEY;

  if (!collection || !secretKey) {
    throw new Error('Environment variables COLLECTION_ADDRESS and SERVICE_SECRET_KEY must be provided');
  }

  const endpoint = process.env.TON_ENDPOINT ?? 'https://testnet.toncenter.com/api/v2/jsonRPC';
  const apiKey = process.env.TON_API_KEY;
  const client = new TonClient({ endpoint, apiKey });

  const ownerAddr = Address.parse(owner).toString();

  for (const nft of nfts) {
    const { stack } = await client.callGetMethod(Address.parse(nft), 'get_nft_data');
    const inited = stack.readNumber();
    stack.readNumber(); // index, ignored
    const collectionAddr = stack.readAddress();
    const ownerOnChain = stack.readAddress();

    if (inited !== 1) {
      throw new Error(`NFT ${nft} is not initialized`);
    }
    if (!collectionAddr || collectionAddr.toString() !== collection) {
      throw new Error(`NFT ${nft} does not belong to required collection`);
    }
    if (!ownerOnChain || ownerOnChain.toString() !== ownerAddr) {
      throw new Error(`NFT ${nft} is not owned by ${owner}`);
    }
  }

  const toSign = beginCell()
    .storeAddress(Address.parse(owner))
    .storeUint(nfts.length, 8);
  for (const nft of nfts) {
    toSign.storeAddress(Address.parse(nft));
  }
  const message = toSign.endCell().toBoc();
  const hash = sha256_sync(message);
  const signature = sign(hash, Buffer.from(secretKey, 'hex'));
  console.log(signature.toString('hex'));
}

main();
