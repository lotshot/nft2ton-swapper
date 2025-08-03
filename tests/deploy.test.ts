import { test } from 'node:test';
import assert from 'node:assert';
import { Blockchain } from '@ton-community/sandbox';
import { Address, Cell, toNano } from 'ton-core';
import { JetClient } from '../client/JetClient';

test('deploys and stores configuration', async () => {
  const blockchain = await Blockchain.create();
  const deployer = await blockchain.treasury('deployer');
  const code = Cell.EMPTY;
  const config = {
    admin: deployer.address,
    collection: deployer.address,
    reward5: toNano('5'),
    reward10: toNano('10'),
    reward20: toNano('20'),
  };
  const jet = blockchain.openContract(JetClient.createFromConfig(config, code));
  await jet.sendDeploy(deployer.getSender());
  const state = await jet.getState();
  assert.equal(state.admin.toString(), config.admin.toString());
  assert.equal(state.collection.toString(), config.collection.toString());
  assert.equal(state.reward5, config.reward5);
  assert.equal(state.reward10, config.reward10);
  assert.equal(state.reward20, config.reward20);
});
