# nft2ton-swapper

**nft2ton-swapper** is a smart contract on the TON blockchain that allows users to exchange **10 non-winning Lotshot NFT tickets** for a fixed TON reward. This "second chance" mechanic boosts player engagement without modifying the main lottery contract.

---

## ⚙️ Features

- Accepts 10 NFT (TIP-4 standard) transfers from a single user
- Verifies that each NFT:
  - Belongs to the sender
  - Has no winning multiplier (`win_multiplier == 0`)
  - Is unique
- Once 10 valid NFTs are received:
  - Sends a reward in TON to the user
  - Stores the NFTs (or optionally forwards them to a null address)

---

## 💰 Parameters

| Parameter         | Description                              | Default Value |
|------------------|------------------------------------------|----------------|
| `REWARD_TON`     | Amount of TON to send per 10 NFTs        | `1 TON`        |
| `NFT_CONTRACT_CODE` | Reference to the original NFT contract | —              |
| `DAILY_LIMIT`    | (Optional) Limit of redemptions per day  | Unlimited      |

---

## 📦 Project Structure

nft2ton-swapper/
├── contracts/ # FunC / Tact smart contract
├── scripts/ # Deployment & testing scripts
├── frontend/ (optional) # dApp UI (React + TonConnect)
├── .env.example # Config for network & admin setup
└── README.md


---

## 🚀 Deployment

1. Install dependencies (`toncli`, `blueprint`, or `ton-core`)
2. Configure `.env` with contract settings
3. Deploy the contract:

```bash
toncli deploy contracts/nft2ton.fc

npx ts-node scripts/test.ts
