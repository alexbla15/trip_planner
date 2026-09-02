"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminMessages, setAdminMessageRead, getAttraction, updateAttraction, type AdminMessage } from "@/services";
import { NewAttractionModal, attractionToFormData, type AttractionFormData } from "@/components/NewAttractionModal";
import type { Attraction } from "@/types/attraction";
import styles from "./AdminMessagesBell.module.css";

const FIELD_LABELS: Record<string, string> = {
  name: "Name", country: "Country", city: "City", coordinates: "Coordinates",
  parentAttractionId: "Parent attraction", types: "Types", foodStyles: "Food styles",
  durationValue: "Duration", durationUnit: "Duration unit", price: "Price", prices: "Price tiers",
  currency: "Currency", openingHours: "Opening hours", openingMonths: "Opening months",
  seasonalStart: "Season start", seasonalEnd: "Season end", notes: "Notes", photoUrl: "Photo",
  websiteUrl: "Website", verified: "Verified", subtype: "Subtype", residenceType: "Residence type",
  checkInDate: "Check-in", checkOutDate: "Check-out", flightNumber: "Flight number",
  airline: "Airline", departureAirport: "Departure airport", arrivalAirport: "Arrival airport",
  departureTime: "Departure time", arrivalTime: "Arrival time", gate: "Gate", seat: "Seat",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length ? JSON.stringify(value) : "—";
  return JSON.stringify(value);
}

/** Admin-only navbar bell — lists attraction-edit notifications (old value → new value per
 *  changed field), lets an admin mark them read/unread, and jumps straight into editing the
 *  affected attraction from the message itself. */
export function AdminMessagesBell() {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingAttractionId, setOpeningAttractionId] = useState<string | null>(null);
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "admin";
  const unreadCount = messages.filter((m) => !m.read).length;

  const refresh = useCallback(() => {
    if (!token || !isAdmin) return;
    setLoading(true);
    getAdminMessages(token)
      .then(setMessages)
      .catch(() => { /* silent — the bell just stays at its last known state */ })
      .finally(() => setLoading(false));
  }, [token, isAdmin]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  async function toggleRead(message: AdminMessage) {
    if (!token) return;
    const nextRead = !message.read;
    setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, read: nextRead } : m)));
    try {
      await setAdminMessageRead(message._id, token, nextRead);
    } catch {
      setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, read: message.read } : m)));
    }
  }

  async function openAttraction(message: AdminMessage) {
    if (!token) return;
    setOpeningAttractionId(message._id);
    try {
      const attraction = (await getAttraction(message.attractionId, token)) as Attraction;
      setEditingAttraction(attraction);
      setOpen(false);
      if (!message.read) {
        setMessages((prev) => prev.map((m) => (m._id === message._id ? { ...m, read: true } : m)));
        setAdminMessageRead(message._id, token, true).catch(() => { /* ignore */ });
      }
    } catch {
      /* attraction may have been deleted since the edit — leave the panel open, do nothing */
    } finally {
      setOpeningAttractionId(null);
    }
  }

  async function handleEditSave(data: AttractionFormData) {
    if (!token || !editingAttraction) return;
    try {
      await updateAttraction(editingAttraction._id, token, data);
    } finally {
      setEditingAttraction(null);
    }
  }

  if (!isAdmin) return null;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className={styles.bellBtn}
        aria-label={unreadCount > 0 ? `Attraction edit notifications, ${unreadCount} unread` : "Attraction edit notifications"}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>

      {open && (
        <div className={styles.panel} role="menu" aria-label="Attraction edit notifications">
          <div className={styles.panelHeader}>
            <span>Attraction edits</span>
            {loading && <Loader2 size={14} className={styles.spinner} aria-hidden="true" />}
          </div>

          {messages.length === 0 && !loading && (
            <div className={styles.empty}>No edit notifications yet.</div>
          )}

          <ul className={styles.list} role="list">
            {messages.map((message) => (
              <li key={message._id} className={`${styles.item} ${!message.read ? styles.itemUnread : ""}`}>
                <div className={styles.itemHeader}>
                  <button
                    type="button"
                    className={styles.itemTitleBtn}
                    onClick={() => openAttraction(message)}
                    disabled={openingAttractionId === message._id}
                  >
                    {!message.read && <span className={styles.unreadDot} aria-hidden="true" />}
                    <span className={styles.itemTitle}>{message.attractionName}</span>
                    {openingAttractionId === message._id ? (
                      <Loader2 size={12} className={styles.spinner} aria-hidden="true" />
                    ) : (
                      <ExternalLink size={12} aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.readToggleBtn}
                    onClick={() => toggleRead(message)}
                    aria-label={message.read ? "Mark as unread" : "Mark as read"}
                    title={message.read ? "Mark as unread" : "Mark as read"}
                  >
                    <Check size={13} aria-hidden="true" />
                  </button>
                </div>
                <div className={styles.itemMeta}>
                  {message.editedByName} · {new Date(message.editedAt).toLocaleString()}
                </div>
                <ul className={styles.changeList}>
                  {message.changes.map((change) => (
                    <li key={change.field} className={styles.changeRow}>
                      <span className={styles.changeField}>{FIELD_LABELS[change.field] ?? change.field}</span>
                      <span className={styles.changeValues}>
                        <span className={styles.changeOld}>{formatValue(change.oldValue)}</span>
                        {" → "}
                        <span className={styles.changeNew}>{formatValue(change.newValue)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editingAttraction && (
        <NewAttractionModal
          isOpen={!!editingAttraction}
          initialData={attractionToFormData(editingAttraction)}
          editingAttractionId={editingAttraction._id}
          token={token}
          onClose={() => setEditingAttraction(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
