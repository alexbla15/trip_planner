"use client";

import { BedDouble, Plus, PenLine, Trash2, Calendar, MapPin, Wallet } from "lucide-react";
import { formatDisplayDate, formatPrice, getNightsCount } from "@/lib";
import { WebsiteLinkButton } from "@/components/WebsiteLinkButton";
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
          {residences.map((a) => {
            const nights = getNightsCount(a.checkInDate, a.checkOutDate);
            const singleDate = a.checkInDate ?? a.checkOutDate;
            const dateRange = a.checkInDate && a.checkOutDate
              ? `${formatDisplayDate(a.checkInDate)} → ${formatDisplayDate(a.checkOutDate)}`
              : singleDate ? formatDisplayDate(singleDate) : null;

            return (
              <li
                key={a._id}
                className={styles.item}
                role="button"
                tabIndex={0}
                aria-label={`View details for ${a.name}`}
                onClick={() => onView(a)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView(a); } }}
              >
                <div className={styles.itemHeader}>
                  <span className={styles.itemIcon} aria-hidden="true">
                    <BedDouble size={15} />
                  </span>
                  <span className={styles.itemName}>{a.name}</span>
                  {a.residenceType && <span className={styles.typeChip}>{a.residenceType}</span>}
                  <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
                    <WebsiteLinkButton url={a.websiteUrl} variant="compact" className={styles.websiteBtn} />
                    {canEdit && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>

                {dateRange && (
                  <div className={styles.datesRow}>
                    <span className={styles.datesText}>
                      <Calendar size={13} aria-hidden="true" />
                      {dateRange}
                    </span>
                    {nights != null && nights > 0 && (
                      <span className={styles.nightsPill}>{nights} night{nights === 1 ? "" : "s"}</span>
                    )}
                  </div>
                )}

                <div className={styles.detailsRow}>
                  {a.city && (
                    <span className={styles.detailItem}>
                      <MapPin size={12} aria-hidden="true" />
                      {a.city}
                    </span>
                  )}
                  {a.price != null && (
                    <span className={styles.detailItem}>
                      <Wallet size={12} aria-hidden="true" />
                      {formatPrice(a.price, a.currency ?? "USD")}
                    </span>
                  )}
                </div>

                {a.notes && <span className={styles.itemNotes}>{a.notes}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
