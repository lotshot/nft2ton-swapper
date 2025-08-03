# NFT ↔ TON Swapper frontend

React + TypeScript + Vite setup used for the NFT to TON swapper demo.

## Configuration

Copy `.env.example` to `.env` and fill in the contract addresses:

```bash
cp .env.example .env
```

Set `VITE_SWAP_CONTRACT` to the Jet contract address and `VITE_NFT_CONTRACT` to
the NFT collection address. You can also override the TonCenter endpoint with
`VITE_TONCENTER_URL` and the NFT lookup API with `VITE_TON_API_URL`.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The build output is generated in the `dist/` directory and can be deployed to any static host (e.g. render.com).
