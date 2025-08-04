# NFT to TON Swapper

This repository contains a FunC smart contract skeleton that allows users to swap batches of Lotshot NFTs for a fixed TON reward.

## Environment Requirements

- Node.js >= 20
- npm

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

Copy `.env.example` to `.env` and fill in:

- `SEED` – mnemonic phrase of the deployer wallet
- `COLLECTION_ADDRESS` – address of the NFT collection allowed to redeem
- `REWARD5`, `REWARD10`, `REWARD20` – TON rewards for 5, 10 and 20 NFTs
- `TON_ENDPOINT` and `TON_API_KEY` – optional RPC endpoint settings

Deploy `jet.fc` to the network using the helper script:

```bash
npm run deploy
```

## Tests

Run the test suite:

```bash
npm test
```

## Frontend

A minimal Vite + React interface lives in `frontend/`. It connects to a TON wallet using [ton-connect](https://github.com/ton-connect/sdk), reads Jet contract state with `JetClient` and `tonweb`, and can be started locally with:

```bash
cd frontend
npm install
npm run dev
```

From the repository root you can also run `npm run dev` which proxies to the same command.

## Project Structure

- `contracts/` – FunC contract sources
- `client/` – JetClient library for interacting with the contract
- `scripts/` – deployment scripts
- `tests/` – unit and integration tests
- `frontend/` – Vite + React interface
- `package.json` – npm scripts and dependencies

## Client Library

The `JetClient` module exposes helper functions for interacting with the contract.
It uses [`ton-core`](https://github.com/ton-community/ton-core) for message
serialization and is exported as the package's main entry.

```ts
import { JetClient, deploy, redeem, readState } from 'Jet';
```

- `deploy(client, wallet, secretKey, config, code, value?)` – deploy the contract.
- `redeem(client, wallet, secretKey, jet, nfts, value?)` – redeem a list of
  NFT addresses for the configured reward.
- `readState(client, address)` – fetch on-chain configuration of the contract.

### Redeem Message Format

Redeem messages must follow a strict binary layout:

1. a 32-bit ASCII prefix `'rede'`;
2. an 8-bit unsigned integer with the NFT count;
3. a reference to a root cell whose refs contain the NFT address cells.

Manually assembling this structure is error-prone. The `JetClient.redeem`
helper constructs a valid message body for a given list of NFT addresses to
ensure correct payloads.

## License

MIT
