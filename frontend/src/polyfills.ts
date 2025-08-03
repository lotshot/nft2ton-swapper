/* eslint-disable @typescript-eslint/no-explicit-any */
import { Buffer } from 'buffer';

if (!(globalThis as any).Buffer) {
  (globalThis as any).Buffer = Buffer;
}
