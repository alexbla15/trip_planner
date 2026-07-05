"use client";

import { BedDouble, Plus, PenLine, Trash2 } from "lucide-react";
import { formatDisplayDate } from "@/lib/formatDate";
import { currencySymbol } from "@/lib/formatCurrency";
import type { Attraction } from "@/types/attraction";
import styles from "./ResidencesList.module.css";

interface ResidencesListProps {
  residences: Attraction[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (a: Attraction) => void;
  onRemove: (id: string) => void;
  onView: (a: Attraction) => void;
}

function residenceMeta(a: Attraction): string {
  const checkIn  = a.checkInDate  ? formatDisplayDate(a.checkInDate)  : "";
  const checkOut = a.checkOutDate ? formatDisplayDate(a.checkOutDate) : "";
  const dates    = checkIn && checkOut ? `${checkIn} → ${checkOut}` : checkIn || checkOut;
  const price    = a.price != null ? `${currencySymbol(a.currency ?? "USD")}${a.price}` : "";
  return [a.residenceType, dates, a.city, price].filter(Boolean).join(" · ");
}

export function ResidencesList({ residences, canEdit, onAdd, onEdit, onRemove, onView }: ResidencesListProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.iconCircle} aria-hidden="true">
            <BedDouble size={16} />
          </span>
          <h2 className={styles.heading}>Residences</h2>
        </div>
        {canEdit && (
          <button type="button" className={styles.addBtn} onClick={onAdd} aria-label="Add a residence">
            <Plus size={14} aria-hidden="true" />
            Add Residence
          </button>
        )}
      </div>

      {residences.length === 0 ? (
        <div className={styles.empty}>
          <BedDouble size={28} className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyText}>No residences added yet.</p>
        </div>
      ) : (
        <ul className={styles.list} aria-label="Residences">
          {residences.map((a) => (
            <li
              key={a._id}
              className={styles.item}
              role="button"
              tabIndex={0}
              aria-label={`View details for ${a.name}`}
              onClick={() => onView(a)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView(a); } }}
            >
              <span className={styles.itemIcon} aria-hidden="true">
                <BedDouble size={15} />
              </span>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{a.name}</span>
                <span className={styles.itemMeta}>{residenceMeta(a)}</span>
                {a.notes && <span className={styles.itemNotes}>{a.notes}</span>}
              </div>
              {canEdit && (
                <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => onEdit(a)}
                    aria-label={`Edit ${a.name}`}
                  >
                    <PenLine size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => onRemove(a._id)}
                    aria-label={`Remove ${a.name}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
