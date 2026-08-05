"use client";

import { useMessageNotifications } from "@/hooks/use-message-notifications";

export function AdvisorMessageNotifications() {
  useMessageNotifications("advisor");
  return null;
}

export function AdminMessageNotifications() {
  useMessageNotifications("admin");
  return null;
}
