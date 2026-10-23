'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import type { Motion } from './Companions';
import { ConversationTimeline, type ConversationLine } from './conversation';

type Props = {
  sam: RefObject<Group | null>;
  companion: RefObject<Group | null>;
  samMotion: RefObject<Motion>;
  companionMotion: RefObject<Motion>;
  paused: boolean;
  active: RefObject<boolean>;
};
export function ConversationBubbles({
  sam,
  companion,
  samMotion,
  companionMotion,
  paused,
  active,
}: Props) {
  const invalidate = useThree((s) => s.invalidate);
  const timeline = useRef(new ConversationTimeline());
  const previous = useRef<ConversationLine | null>(null);
  const [line, setLine] = useState<ConversationLine | null>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      const a = sam.current,
        b = companion.current;
      const available = (m: Motion) =>
        !m.walking &&
        !m.gesture &&
        !m.viewing &&
        !m.reach &&
        (m.teaTime !== undefined ||
          (!m.seated &&
            !['sleep', 'work', 'stretch'].includes(m.routine ?? '')));
      const ready =
        !paused &&
        !document.hidden &&
        !!a &&
        !!b &&
        a.position.distanceTo(b.position) < 2.4 &&
        available(samMotion.current) &&
        available(companionMotion.current);
      const next = timeline.current.step(
        0.2,
        ready,
        samMotion.current.teaTime !== undefined,
      );
      active.current = !!next;
      if (next !== previous.current) {
        previous.current = next;
        setLine(next);
        invalidate();
      }
    }, 200);
    return () => {
      clearInterval(timer);
      active.current = false;
    };
  }, [sam, companion, samMotion, companionMotion, paused, active, invalidate]);
  if (paused || !line) return null;
  const actor = line.speaker === 'sam' ? sam.current : companion.current;
  if (!actor) return null;
  return (
    <Html
      center
      position={[actor.position.x, actor.position.y + 1.65, actor.position.z]}
      zIndexRange={[18, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        className={`conversation-bubble conversation-bubble--${line.speaker}`}
      >
        <span className="conversation-speaker">
          {line.speaker === 'sam' ? 'SAM' : '旅伴'}
        </span>
        <p>{line.text}</p>
      </div>
    </Html>
  );
}
