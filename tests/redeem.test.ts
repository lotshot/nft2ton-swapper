import { test } from 'node:test';
import assert from 'node:assert';
import { Blockchain } from '@ton-community/sandbox';
import { Cell, Address, toNano } from 'ton-core';
import { compileFunc } from '@ton-community/func-js';
import { readFileSync } from 'fs';
import { JetClient } from '../client/JetClient';

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

test('redeem 20 NFTs', async () => {
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
  for (let i = 0; i < 20; i++) {
    const t = await blockchain.treasury('nft' + i);
    nfts.push(t.address);
  }

  const res = await jet.sendRedeem(user.getSender(), { nfts, value: toNano('0.05') });
  assert(res.transactions.some((t) => t.outMessages.size > 0));
});

