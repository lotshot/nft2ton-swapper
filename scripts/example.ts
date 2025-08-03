import { compile } from '@ton-community/blueprint';

export async function run() {
  await compile('contracts/jet.fc');
}
