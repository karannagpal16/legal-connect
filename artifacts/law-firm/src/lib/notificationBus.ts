import type { ResolvedNotificationAction } from "@/lib/notificationActions";

export const NOTIFICATION_ACTION_EVENT = "lc:notification-action";

export type NotificationActionDetail = {
  title: string;
  message: string;
  resolved: ResolvedNotificationAction;
};

export function emitNotificationAction(detail: NotificationActionDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_ACTION_EVENT, { detail }));
}

export function onNotificationAction(handler: (detail: NotificationActionDetail) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const custom = event as CustomEvent<NotificationActionDetail>;
    if (custom.detail) handler(custom.detail);
  };
  window.addEventListener(NOTIFICATION_ACTION_EVENT, listener);
  return () => window.removeEventListener(NOTIFICATION_ACTION_EVENT, listener);
}
