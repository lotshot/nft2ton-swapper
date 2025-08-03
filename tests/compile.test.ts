import { execSync } from 'child_process';
import { test } from 'node:test';

test('TypeScript builds', () => {
  execSync('npx tsc --noEmit');
});
