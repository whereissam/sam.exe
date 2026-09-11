'use client';
import { useSyncExternalStore } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  subscribeSound,
  soundEnabled,
  serverSoundEnabled,
  setSoundEnabled,
} from './sound';
export function SoundToggle({ className }: { className?: string }) {
  const enabled = useSyncExternalStore(
    subscribeSound,
    soundEnabled,
    serverSoundEnabled,
  );
  return (
    <button
      className={className}
      type="button"
      aria-label="Sound effects"
      aria-pressed={enabled}
      title={enabled ? 'Mute sound effects' : 'Enable sound effects'}
      onClick={() => setSoundEnabled(!enabled)}
    >
      {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
