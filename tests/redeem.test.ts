import { test } from 'node:test';
import assert from 'node:assert';
import { Blockchain } from '@ton-community/sandbox';
import { Cell, Address, beginCell, toNano } from 'ton-core';
import { compileFunc } from '@ton-community/func-js';
import { readFileSync } from 'fs';
import { JetClient } from '../client/JetClient';
import { OP_REDEEM } from '../opcodes';

async function compileJet(): Promise<Cell> {
  const result = await compileFunc({
    targets: ['jet.fc'],
    sources: {
      'jet.fc':
        readFileSync('contracts/stdlib.fc', 'utf8') +
        '\n' +
        readFileSync('contracts/jet.fc', 'utf8'),
    },
  });
  if (result.status !== 'ok') {
    throw new Error(result.message);
  }
  return Cell.fromBoc(Buffer.from(result.codeBoc, 'base64'))[0];
}

function buildNftCell(nfts: Address[]): Cell {
  const build = (index: number): Cell => {
    const b = beginCell().storeAddress(nfts[index]);
    if (index + 1 < nfts.length) {
      b.storeRef(build(index + 1));
    }
    return b.endCell();
  };
  return build(0);
}

test('redeem payload succeeds with uint64 query id', async () => {
  const blockchain = await Blockchain.create();
  const admin = await blockchain.treasury('admin');
  const user = await blockchain.treasury('user');
  const code = await compileJet();
  const jet = blockchain.openContract(
    JetClient.createFromConfig(
      {
        admin: admin.address,
        collection: admin.address,
        reward5: toNano('5'),
        reward10: toNano('10'),
        reward20: toNano('20'),
      },
      code,
    ),
  );
  await jet.sendDeploy(admin.getSender(), toNano('25'));

  const nfts: Address[] = [];
  for (let i = 0; i < 5; i++) {
    const t = await blockchain.treasury('nft' + i);
    nfts.push(t.address);
  }

  const nftsCell = buildNftCell(nfts);
  const body = beginCell()
    .storeUint(OP_REDEEM, 32)
    .storeUint(1, 64)
    .storeUint(nfts.length, 8)
    .storeRef(nftsCell)
    .endCell();
  const res: any = await user.send({
    to: jet.address,
    value: toNano('0.05'),
    body,
    bounce: true,
  });
  const exitCodes = res.transactions.map(
    (t: any) => t.description?.computePhase?.exitCode,
  );
  assert(exitCodes.includes(0));
});

test('redeem with varuint instead of uint64 fails', async () => {
  const blockchain = await Blockchain.create();
  const admin = await blockchain.treasury('admin');
  const user = await blockchain.treasury('user');
  const code = await compileJet();
  const jet = blockchain.openContract(
    JetClient.createFromConfig(
      {
        admin: admin.address,
        collection: admin.address,
        reward5: toNano('5'),
        reward10: toNano('10'),
        reward20: toNano('20'),
      },
      code,
    ),
  );
  await jet.sendDeploy(admin.getSender(), toNano('25'));

  const nfts: Address[] = [];
  for (let i = 0; i < 5; i++) {
    const t = await blockchain.treasury('nft_bad' + i);
    nfts.push(t.address);
  }

  const nftsCell = buildNftCell(nfts);
  const badBody = beginCell()
    .storeUint(OP_REDEEM, 32)
    .storeUint(nfts.length, 8)
    .storeRef(nftsCell)
    .endCell();
  const res: any = await user.send({
    to: jet.address,
    value: toNano('0.05'),
    body: badBody,
    bounce: true,
  });
  const exitCodes = res.transactions.map(
    (t: any) => t.description?.computePhase?.exitCode,
  );
  assert(exitCodes.includes(0xffff));
});
