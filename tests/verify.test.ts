import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Address } from 'ton-core';
import { verifyNfts } from '../scripts/verify';

class MockStack {
  constructor(private values: any[]) {}
  readNumber() { return this.values.shift(); }
  readAddress() { return this.values.shift(); }
}

class MockClient {
  constructor(private responses: Record<string, any[]>) {}
  async callGetMethod(addr: Address, _method: string) {
    const res = this.responses[addr.toString()];
    return { stack: new MockStack([...res]) };
  }
}

test('verifyNfts accepts valid NFTs', async () => {
  const collection = Address.parse('0:' + '0'.repeat(64)).toString();
  const owner = Address.parse('0:' + '1'.repeat(64)).toString();
  const nft = Address.parse('0:' + '2'.repeat(64)).toString();
  const client = new MockClient({
    [nft]: [1, 0, Address.parse(collection), Address.parse(owner)],
  });
  await verifyNfts(client as any, owner, [nft], collection);
});

test('verifyNfts rejects wrong owner', async () => {
  const collection = Address.parse('0:' + '0'.repeat(64)).toString();
  const owner = Address.parse('0:' + '1'.repeat(64)).toString();
  const nft = Address.parse('0:' + '2'.repeat(64)).toString();
  const other = Address.parse('0:' + '3'.repeat(64));
  const client = new MockClient({
    [nft]: [1, 0, Address.parse(collection), other],
  });
  await assert.rejects(() => verifyNfts(client as any, owner, [nft], collection));
});
