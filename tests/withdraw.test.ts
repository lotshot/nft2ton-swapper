import { test } from 'node:test';
import assert from 'node:assert';
import { Blockchain } from '@ton-community/sandbox';
import { Cell, toNano } from 'ton-core';
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

async function setup() {
  const blockchain = await Blockchain.create();
  const admin = await blockchain.treasury('admin');
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
  await jet.sendDeploy(admin.getSender());
  return { blockchain, admin, jet };
}

test('admin can withdraw', async () => {
  const { admin, jet } = await setup();
  const value = toNano('0.02');
  const amount = toNano('0.01');
  const res = await jet.sendWithdraw(admin.getSender(), { amount, value });
  const tx = res.transactions.find(
    (t) => t.inMessage?.info.dest?.toString() === admin.address.toString(),
  );
  assert(tx);
  const inMsg = tx!.inMessage!;
  assert.equal(inMsg.info.dest?.toString(), admin.address.toString());
});

test('non-admin cannot withdraw', async () => {
  const { blockchain, admin, jet } = await setup();
  const user = await blockchain.treasury('user');
  const value = toNano('0.02');
  const amount = toNano('0.01');
  const res = await jet.sendWithdraw(user.getSender(), { amount, value });
  const toAdmin = res.transactions.find(
    (t) => t.inMessage?.info.dest?.toString() === admin.address.toString(),
  );
  assert.equal(toAdmin, undefined);
});
