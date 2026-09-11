import type { MouseEvent } from 'react';

/** True only for a click on a modal dialog's backdrop.
 *
 *  A `showModal()` backdrop reports the dialog itself as the target, so the
 *  usual `target === currentTarget` test also fires for clicks inside the
 *  dialog's own padding, and for keyboard-driven clicks on inner buttons
 *  (which bubble up carrying clientX/clientY of 0). Requiring the point to
 *  fall outside the dialog's box rules both of those out. */
export function isBackdropClick(event: MouseEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  if (!box.width || !box.height) return false;
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}
