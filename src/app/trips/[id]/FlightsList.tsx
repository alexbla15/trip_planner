"use client";

import { Plane, Plus, PenLine, Trash2 } from "lucide-react";
import { formatDisplayDate } from "@/lib/formatDate";
import type { Attraction } from "@/types/attraction";
import styles from "./FlightsList.module.css";

interface FlightsListProps {
  flights: Attraction[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (a: Attraction) => void;
  onRemove: (id: string) => void;
  onView: (a: Attraction) => void;
}

function flightMeta(a: Attraction): string {
  const route = [a.departureAirport, a.arrivalAirport].filter(Boolean).join(" → ");
  const depTime = a.departureTime ? a.departureTime.split("T")[1]?.slice(0, 5) : "";
  const arrTime = a.arrivalTime   ? a.arrivalTime.split("T")[1]?.slice(0, 5)   : "";
  const times   = depTime && arrTime ? `${depTime}–${arrTime}` : depTime || arrTime;
  const date    = a.plannedDate ? formatDisplayDate(a.plannedDate) : "";
  return [a.airline, a.flightNumber, route, times, date].filter(Boolean).join(" · ");
}

export function FlightsList({ flights, canEdit, onAdd, onEdit, onRemove, onView }: FlightsListProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.iconCircle} aria-hidden="true">
            <Plane size={16} />
          </span>
          <h2 className={styles.heading}>Flights</h2>
        </div>
        {canEdit && (
          <button type="button" className={styles.addBtn} onClick={onAdd} aria-label="Add a flight">
            <Plus size={14} aria-hidden="true" />
            Add Flight
          </button>
        )}
      </div>

      {flights.length === 0 ? (
        <div className={styles.empty}>
          <Plane size={28} className={styles.emptyIcon} aria-hidden="true" />
          <p className={styles.emptyText}>No flights added yet.</p>
        </div>
      ) : (
        <ul className={styles.list} aria-label="Flights">
          {flights.map((a) => (
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
                <Plane size={15} />
              </span>
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{a.name}</span>
                <span className={styles.itemMeta}>{flightMeta(a)}</span>
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
