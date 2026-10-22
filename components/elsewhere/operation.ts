import type { Action } from './journey';
export const operationDuration = (action: Action) =>
  action === 'ticket'
    ? 3.4
    : action === 'bag'
      ? 3.2
      : action === 'board' || action.startsWith('ride:')
        ? 4
        : action === 'alight'
          ? 4
          : 0.8;
export const operationLabel = (action: Action, progress: number) =>
  action === 'ticket'
    ? progress < 0.22
      ? '正在操作售票機…'
      : progress < 0.65
        ? '車票列印中…'
        : '拿起車票，收好再出發。'
    : action === 'bag'
      ? progress < 0.2
        ? '確認寄物牌，握住提把…'
        : progress < 0.5
          ? '提起旅行箱…'
          : '把行李拿到身邊，準備出發。'
      : action === 'alight'
        ? '列車已停妥，正在下車…'
        : action === 'board' || action.startsWith('ride:')
          ? '確認車票，走上列車…'
          : '確認目的地…';
export const ticketPose = (progress: number) => ({
  visible: progress >= 0.22 && progress < 1,
  printed: Math.min(1, Math.max(0, (progress - 0.22) / 0.4)),
  collected: Math.min(1, Math.max(0, (progress - 0.65) / 0.35)),
});
