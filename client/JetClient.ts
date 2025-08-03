import { Address, Cell, beginCell, contractAddress, toNano, Contract, ContractProvider, Sender } from 'ton-core';
import { TonClient, WalletContractV4, internal } from 'ton';

export const OP_REDEEM = 0x72656465; // "redeem" prefix

export type JetConfig = {
  collection: Address;
  reward5: bigint;
  reward10: bigint;
  reward20: bigint;
};

export function jetConfigToCell(config: JetConfig): Cell {
  return beginCell()
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
    const value = opts.value ?? toNano('0.05');
    const body = beginCell()
      .storeUint(OP_REDEEM, 32)
      .storeUint(opts.nfts.length, 8);
    for (const nft of opts.nfts) {
      body.storeAddress(nft);
    }
    await provider.internal(via, {
      value,
      body: body.endCell(),
    });
  }

  async getState(provider: ContractProvider): Promise<JetConfig> {
    const state = await provider.getState();
    if (state.state.type !== 'active' || !state.state.data) {
      throw new Error('No state data');
    }
    const cs = Cell.fromBoc(state.state.data)[0].beginParse();
    return {
      collection: cs.loadAddress(),
      reward5: cs.loadCoins(),
      reward10: cs.loadCoins(),
      reward20: cs.loadCoins(),
    };
  }
}

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
  const body = beginCell()
    .storeUint(OP_REDEEM, 32)
    .storeUint(nfts.length, 8);
  for (const nft of nfts) {
    body.storeAddress(nft);
  }
  await walletContract.sendTransfer({
    secretKey,
    seqno,
    messages: [
      internal({ to: jet.address, value, body: body.endCell() }),
    ],
  });
}

export async function readState(client: TonClient, address: Address): Promise<JetConfig> {
  const state = await client.getContractState(address);
  if (!state.data) throw new Error('No state found');
  const data = Cell.fromBoc(state.data)[0];
  const cs = data.beginParse();
  return {
    collection: cs.loadAddress(),
    reward5: cs.loadCoins(),
    reward10: cs.loadCoins(),
    reward20: cs.loadCoins(),
  };
}
