import { Address, Cell, beginCell, contractAddress, toNano } from 'ton-core';
import type { Contract, ContractProvider, Sender } from 'ton-core';
import { TonClient, WalletContractV4, internal } from 'ton';

export const OP_REDEEM = 0x72656465; // "rede" prefix
export const OP_WITHDRAW = 0x77697468; // "with" prefix

export type JetConfig = {
  admin: Address;
  collection: Address;
  reward5: bigint;
  reward10: bigint;
  reward20: bigint;
};

function serializeNftAddresses(nfts: Address[]): Cell {
  const build = (index: number): Cell => {
    const b = beginCell().storeAddress(nfts[index]);
    console.log(`serialize cell ${index}: bits=${b.bits} refs=${b.refs}`);
    if (index + 1 < nfts.length) {
      b.storeRef(build(index + 1));
    }
    return b.endCell();
  };
  return build(0);
}

export function jetConfigToCell(config: JetConfig): Cell {
  return beginCell()
    .storeAddress(config.admin)
    .storeAddress(config.collection)
    .storeCoins(config.reward5)
    .storeCoins(config.reward10)
    .storeCoins(config.reward20)
    .endCell();
}

export class JetClient implements Contract {
  readonly address: Address;
  readonly init?: { code: Cell; data: Cell };

  constructor(address: Address, init?: { code: Cell; data: Cell }) {
    this.address = address;
    this.init = init;
  }

  static createFromConfig(config: JetConfig, code: Cell, workchain = 0) {
    const data = jetConfigToCell(config);
    const init = { code, data };
    const address = contractAddress(workchain, init);
    return new JetClient(address, init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint = toNano('0.05')) {
    if (!this.init) throw new Error('Init required for deploy');
    await provider.internal(via, {
      value,
      bounce: false,
      init: this.init,
    } as any);
  }

  async sendRedeem(provider: ContractProvider, via: Sender, opts: { nfts: Address[]; value?: bigint }) {
    if (opts.nfts.length > 20) {
      throw new Error('Up to 20 NFTs allowed in one swap');
    }
    const value = opts.value ?? toNano('0.05');
    const nftsCell = serializeNftAddresses(opts.nfts);
    const body = beginCell()
      .storeUint(OP_REDEEM, 32)
      .storeUint(opts.nfts.length, 8)
      .storeRef(nftsCell)
      .endCell();
    await provider.internal(via, {
      value,
      body,
    });
  }

  async sendWithdraw(provider: ContractProvider, via: Sender, opts: { amount: bigint; value?: bigint }) {
    const value = opts.value ?? toNano('0.05');
    const body = beginCell()
      .storeUint(OP_WITHDRAW, 32)
      .storeCoins(opts.amount)
      .endCell();
    await provider.internal(via, {
      value,
      body,
    });
  }

  async getState(provider: ContractProvider): Promise<JetConfig> {
    const state = await provider.getState();
    if (state.state.type !== 'active' || !state.state.data) {
      throw new Error('No state data');
    }
    const cs = Cell.fromBoc(state.state.data)[0].beginParse();
    return {
      admin: cs.loadAddress(),
      collection: cs.loadAddress(),
      reward5: cs.loadCoins(),
      reward10: cs.loadCoins(),
      reward20: cs.loadCoins(),
    };
  }
}

/**
 * Deploys a Jet contract instance to the blockchain.
 *
 * @param client TON client used to send the deploy transaction
 * @param wallet Wallet that signs the deployment
 * @param secretKey Secret key of the wallet
 * @param config On-chain configuration of the Jet contract
 * @param code Compiled contract code cell
 * @param value Amount of TON to send with the deploy message
 */
export async function deploy(
  client: TonClient,
  wallet: WalletContractV4,
  secretKey: Buffer,
  config: JetConfig,
  code: Cell,
  value: bigint = toNano('0.05'),
): Promise<JetClient> {
  const jet = JetClient.createFromConfig(config, code);
  const walletContract = client.open(wallet);
  const seqno = await walletContract.getSeqno();
  await walletContract.sendTransfer({
    secretKey,
    seqno,
      messages: [
        internal({
          to: jet.address,
          value,
          bounce: false,
          init: jet.init,
        } as any),
      ],
  });
  return jet;
}

/**
 * Redeems a batch of NFTs for the configured TON reward.
 *
 * @param client TON client used to send the transaction
 * @param wallet Wallet that signs the message
 * @param secretKey Secret key of the wallet
 * @param jet Instance of the deployed Jet contract
 * @param nfts Array of NFT addresses being redeemed
 * @param value Amount of TON to send along with the message
 */
export async function redeem(
  client: TonClient,
  wallet: WalletContractV4,
  secretKey: Buffer,
  jet: JetClient,
  nfts: Address[],
  value: bigint = toNano('0.05'),
): Promise<void> {
  const walletContract = client.open(wallet);
  const seqno = await walletContract.getSeqno();
  if (nfts.length > 20) {
    throw new Error('Up to 20 NFTs allowed in one swap');
  }
  const nftCell = serializeNftAddresses(nfts);
  const body = beginCell()
    .storeUint(OP_REDEEM, 32)
    .storeUint(nfts.length, 8)
    .storeRef(nftCell)
    .endCell();
  await walletContract.sendTransfer({
    secretKey,
    seqno,
    messages: [
      internal({ to: jet.address, value, body }),
    ],
  });
}

/**
 * Withdraws TON from the contract to the admin wallet.
 */
export async function withdraw(
  client: TonClient,
  wallet: WalletContractV4,
  secretKey: Buffer,
  jet: JetClient,
  amount: bigint,
  value: bigint = toNano('0.05'),
): Promise<void> {
  const walletContract = client.open(wallet);
  const seqno = await walletContract.getSeqno();
  const body = beginCell()
    .storeUint(OP_WITHDRAW, 32)
    .storeCoins(amount)
    .endCell();
  await walletContract.sendTransfer({
    secretKey,
    seqno,
    messages: [internal({ to: jet.address, value, body })],
  });
}

/**
 * Reads on-chain configuration of a Jet contract.
 *
 * @param client TON client used for the query
 * @param address Address of the contract to inspect
 */
export async function readState(client: TonClient, address: Address): Promise<JetConfig> {
  const state = await client.getContractState(address);
  if (!state.data) throw new Error('No state found');
  const data = Cell.fromBoc(state.data)[0];
  const cs = data.beginParse();
  return {
    admin: cs.loadAddress(),
    collection: cs.loadAddress(),
    reward5: cs.loadCoins(),
    reward10: cs.loadCoins(),
    reward20: cs.loadCoins(),
  };
}
