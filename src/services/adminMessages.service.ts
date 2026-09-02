import { parseOrThrow } from "./http";

export interface AdminMessageFieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AdminMessage {
  _id: string;
  attractionId: string;
  attractionName: string;
  editedBy: string;
  editedByName: string;
  editedAt: string;
  changes: AdminMessageFieldChange[];
  read: boolean;
}

export async function getAdminMessages(token: string, unreadOnly = false): Promise<AdminMessage[]> {
  const res = await fetch(`/api/admin/messages${unreadOnly ? "?unread=1" : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseOrThrow<AdminMessage[]>(res);
}

export async function setAdminMessageRead(id: string, token: string, read: boolean): Promise<AdminMessage> {
  const res = await fetch(`/api/admin/messages/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ read }),
  });
  return parseOrThrow<AdminMessage>(res);
}
