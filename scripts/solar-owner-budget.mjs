// Fixed owner approval: 18 October 2026, at most 3 Maps loads and 1 Solar attempt.
// Persist across restarts; corruption or a held lock fails closed.
import {
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
export function ownerBudget(directory) {
  mkdirSync(directory, { recursive: true });
  const file = join(directory, 'approved-2026-10-18-budget.json');
  const lock = file + '.lock';
  try {
    writeFileSync(
      file,
      JSON.stringify({
        approval: '2026-10-18-private-owner',
        maps: 0,
        solar: 0,
      }),
      { flag: 'wx' },
    );
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  function read() {
    const state = JSON.parse(readFileSync(file, 'utf8'));
    if (
      state.approval !== '2026-10-18-private-owner' ||
      !Number.isInteger(state.maps) ||
      state.maps < 0 ||
      state.maps > 3 ||
      !Number.isInteger(state.solar) ||
      state.solar < 0 ||
      state.solar > 1
    )
      throw new Error('Private budget unavailable');
    return state;
  }
  return {
    reserve(kind) {
      if (!['maps', 'solar'].includes(kind))
        throw new Error('Unknown private allowance');
      const handle = openSync(lock, 'wx');
      try {
        const state = read();
        if (state[kind] >= (kind === 'maps' ? 3 : 1)) return false;
        state[kind]++;
        writeFileSync(file, JSON.stringify(state));
        return true;
      } finally {
        closeSync(handle);
        unlinkSync(lock);
      }
    },
    remaining() {
      const state = read();
      return { maps: 3 - state.maps, solar: 1 - state.solar };
    },
  };
}
