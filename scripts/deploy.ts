import 'dotenv/config';
import { compileFunc } from '@ton-community/func-js';
import { readFileSync } from 'fs';
import { Address, Cell, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { JetClient } from '../client/JetClient';

export async function run(provider: NetworkProvider) {
  const ui = provider.ui();
  const collectionEnv = process.env.COLLECTION_ADDRESS;
  if (!collectionEnv) {
    throw new Error('COLLECTION_ADDRESS env not set');
  }

  const adminEnv = process.env.ADMIN_ADDRESS ?? collectionEnv;
  const admin = Address.parse(adminEnv);
  const collection = Address.parse(collectionEnv);
  const reward5 = toNano(process.env.REWARD5 || '0');
  const reward10 = toNano(process.env.REWARD10 || '0');
  const reward20 = toNano(process.env.REWARD20 || '0');

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

  const code = Cell.fromBoc(Buffer.from(result.codeBoc, 'base64'))[0];

  const jet = provider.open(
    JetClient.createFromConfig(
      {
        admin,
        collection,
        reward5,
        reward10,
        reward20,
      },
      code,
    ),
  );

  await jet.sendDeploy(provider.sender());
  await provider.waitForDeploy(jet.address);
  ui.write(`Deploy request sent to ${jet.address.toString()}`);
}
