import { Address, TonClient } from 'ton';

export async function verifyNfts(
  client: TonClient,
  owner: string,
  nfts: string[],
  collection: string,
): Promise<void> {
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
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: ts-node scripts/verify.ts <owner> <nft1> [nft2 ...]');
    return;
  }

  const owner = args[0];
  const nfts = args.slice(1);
  const collection = process.env.COLLECTION_ADDRESS;

  if (!collection) {
    throw new Error('Environment variable COLLECTION_ADDRESS must be provided');
  }

  const endpoint = process.env.TON_ENDPOINT ?? 'https://testnet.toncenter.com/api/v2/jsonRPC';
  const apiKey = process.env.TON_API_KEY;
  const client = new TonClient({ endpoint, apiKey });

  await verifyNfts(client, owner, nfts, collection);

  console.log('All NFTs valid');
}

// Execute main only when run as a script
if (typeof require !== 'undefined' && require.main === module) {
  main();
}
