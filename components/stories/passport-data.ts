import { districts } from '../world/districts';
export const PASSPORT_KEY = 'sam-exe-passport-v1';
export type PassportData = {
  version: 1;
  visited: string[];
  collected: string[];
  character: 'sam' | 'companion';
  nickname: string;
  note: string;
  updatedAt: string;
};
export function readPassport(raw: string): PassportData {
  const v: unknown = JSON.parse(raw);
  if (!v || typeof v !== 'object' || !('version' in v) || v.version !== 1)
    throw new Error('Unsupported passport');
  const data = v as Record<string, unknown>;
  const ids = (value: unknown, allowed: string[]) =>
    Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string =>
                typeof id === 'string' && allowed.includes(id),
            ),
          ),
        ]
      : [];
  return {
    version: 1,
    visited: ids(
      data.visited,
      districts.map((d) => d.id),
    ),
    collected: ids(data.collected, ['curiosity', 'craft', 'wander']),
    character: data.character === 'companion' ? 'companion' : 'sam',
    nickname:
      typeof data.nickname === 'string' ? data.nickname.slice(0, 40) : '',
    note: typeof data.note === 'string' ? data.note.slice(0, 1000) : '',
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
  };
}
