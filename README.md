# NFT to TON Swapper

This repository contains a FunC smart contract skeleton that will allow users to swap batches of non-winning Lotshot NFTs for a fixed TON reward.

## Development

Install dependencies:

```bash
npm install
```

Start the contract with [Blueprint](https://github.com/ton-community/blueprint):

```bash
npm run start
# Choose a contract file when prompted
```

## Deployment

Deploy `jet.fc` to the network using the helper script:

```bash
SEED="<mnemonic>" COLLECTION_ADDRESS="<nft_collection>" REWARD5="1" REWARD10="2" REWARD20="3" npm run deploy
```

Environment variables:

- `SEED` – mnemonic phrase of the deployer wallet
- `COLLECTION_ADDRESS` – address of the NFT collection allowed to redeem
- `REWARD5`, `REWARD10`, `REWARD20` – TON rewards for 5, 10 and 20 NFTs
- `TON_ENDPOINT` and `TON_API_KEY` – optional RPC endpoint settings

## Project Structure

- `contracts/jet.fc` – FunC contract skeleton
- `package.json` – npm scripts and dependencies

## License

MIT
