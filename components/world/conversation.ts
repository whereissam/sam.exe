export type ConversationLine = { speaker: 'sam' | 'companion'; text: string };
const chats: ConversationLine[][] = [
  [
    { speaker: 'sam', text: '今天想先去哪裡？' },
    { speaker: 'companion', text: '去看看照片吧，挑下一趟旅行的地方。' },
  ],
  [
    { speaker: 'companion', text: '工作坊裡又有新點子了嗎？' },
    { speaker: 'sam', text: '有啊。等一下，一起去看看。' },
  ],
  [
    { speaker: 'sam', text: '你看，鐘塔也慢慢走到下午了。' },
    { speaker: 'companion', text: '那就慢慢逛，不用趕時間。' },
  ],
];
const teaChats: ConversationLine[][] = [
  [
    { speaker: 'companion', text: '先休息一下，茶還是熱的。' },
    { speaker: 'sam', text: '好，今天的點子可以晚一點再想。' },
  ],
  [
    { speaker: 'sam', text: '下次想帶相機去哪裡？' },
    { speaker: 'companion', text: '找個有海的地方，等一個好看的日落。' },
  ],
];

/** Idle-only, alternating lines. Interruptions discard the unfinished conversation. */
export class ConversationTimeline {
  private idle = 0;
  private cooldown = 8;
  private index = 0;
  private script: ConversationLine[] | null = null;
  step(dt: number, ready: boolean, tea: boolean): ConversationLine | null {
    if (!ready) {
      this.idle = 0;
      this.script = null;
      this.cooldown = 8;
      return null;
    }
    this.idle += Math.max(0, Math.min(dt, 0.5));
    if (this.idle < this.cooldown) return null;
    if (!this.script) {
      const pool = tea ? teaChats : chats;
      this.script = pool[this.index++ % pool.length];
    }
    const line = Math.floor((this.idle - this.cooldown) / 5);
    if (line < this.script.length) return this.script[line];
    this.idle = 0;
    this.cooldown = 40;
    this.script = null;
    return null;
  }
}

/** Turn along the shortest arc toward the other traveller, without moving either one. */
export function conversationHeading(
  heading: number,
  from: { x: number; z: number },
  to: { x: number; z: number },
  dt: number,
  reduced = false,
) {
  const dx = to.x - from.x,
    dz = to.z - from.z;
  if (Math.hypot(dx, dz) < 0.001) return heading;
  const target = Math.atan2(dx, dz);
  const delta = Math.atan2(
    Math.sin(target - heading),
    Math.cos(target - heading),
  );
  return (
    heading +
    delta * (reduced ? 1 : 1 - Math.exp(-8 * Math.max(0, Math.min(dt, 0.05))))
  );
}
