import { compileFunc } from '@ton-community/func-js';
import { readFileSync } from 'fs';
import { Address, Cell, toNano } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { JetClient } from '../client/JetClient';

export async function run(provider: NetworkProvider) {
  const ui = provider.ui();

  const collection = Address.parse(await ui.input('Collection address'));
  const reward5 = toNano((await ui.input('Reward for 5 NFTs in TON (default 0):')) || '0');
  const reward10 = toNano((await ui.input('Reward for 10 NFTs in TON (default 0):')) || '0');
  const reward20 = toNano((await ui.input('Reward for 20 NFTs in TON (default 0):')) || '0');

  const result = await compileFunc({
    targets: ['main.fc'],
    sources: {
      'main.fc':
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
