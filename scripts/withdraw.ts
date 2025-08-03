import 'dotenv/config';
import { toNano, Address } from 'ton-core';
import { NetworkProvider } from '@ton-community/blueprint';
import { JetClient } from '../client/JetClient';

export async function run(provider: NetworkProvider) {
  const ui = provider.ui();
  const jetAddress = process.env.JET_ADDRESS;
  if (!jetAddress) {
    throw new Error('JET_ADDRESS env not set');
  }

  const jet = provider.open(new JetClient(Address.parse(jetAddress)));

  const amountStr = await ui.input('Enter TON amount to withdraw:');
  const amount = toNano(amountStr);

  await jet.sendWithdraw(provider.sender(), { amount });
  ui.write(`Withdraw request sent for ${amountStr} TON`);
}
