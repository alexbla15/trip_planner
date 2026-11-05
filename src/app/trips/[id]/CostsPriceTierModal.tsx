"use client";

import { Minus, Plus } from "lucide-react";
import { ModalShell } from "@/components/Modal";
import { buildPriceTierTabs, buildPricePivot } from "@/components/AttractionDetailModal/AttractionDetailModal.utils";
import type { Attraction, PriceTier } from "@/types/attraction";
import styles from "./CostsPriceTierModal.module.css";

const HEADING_ID = "costs-price-tier-modal-title";

interface CostsPriceTierModalProps {
  attraction: Attraction;
  onClose: () => void;
  canEdit: boolean;
  /** Which product tab (see buildPriceTierTabs) is active — lifted to the caller so it
   *  persists per-attraction across closing/reopening this popup. */
  activeTab: number;
  onTabChange: (i: number) => void;
  getQty: (tier: PriceTier) => number;
  onChangeQty: (tier: PriceTier, delta: number) => void;
  /** Formats an amount in the attraction's own currency converted to the trip currency — the parent owns FX rates. */
  formatAmount: (amount: number) => string;
}

/** The attraction's own price tiers/tabs/columns (same buildPriceTierTabs/buildPricePivot
 *  shape and order as its detail card), opened as a popup from the Costs tab's "View
 *  prices" button instead of rendered inline — a quantity stepper per cell in place of a
 *  plain price, with cells the user has put a quantity against highlighted. */
export function CostsPriceTierModal({ attraction, onClose, canEdit, activeTab, onTabChange, getQty, onChangeQty, formatAmount }: CostsPriceTierModalProps) {
  const priceTabs = buildPriceTierTabs(attraction.prices ?? []);
  if (priceTabs.length === 0) return null;
  const activeIdx = Math.min(activeTab, priceTabs.length - 1);
  const pivot = buildPricePivot(priceTabs[activeIdx].tiers);

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      styles={styles}
      headingId={HEADING_ID}
      header={
        <div className={styles.headerTitle}>
          <h2 id={HEADING_ID} className={styles.title}>{attraction.name}</h2>
        </div>
      }
    >
      {priceTabs.length > 1 && (
        <div className={styles.priceTabs} role="tablist" aria-label={`${attraction.name} price options`}>
          {priceTabs.map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={i === activeIdx}
              className={`${styles.priceTab} ${i === activeIdx ? styles.priceTabActive : ""}`}
              onClick={() => onTabChange(i)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <div className={styles.priceTableScroll}>
        <table key={priceTabs[activeIdx].key} className={styles.priceTable} aria-label={`${priceTabs[activeIdx].label} pricing`}>
          <thead>
            <tr>
              <th className={styles.priceColField} scope="col">Tier</th>
              {pivot.columns.map((col) => (
                <th key={col.key} className={styles.priceColVisitor} scope="col">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pivot.rows.map((row) => (
              <tr key={row.label} className={styles.priceRow}>
                <td className={styles.priceColField}>
                  <span className={styles.priceLabel}>{row.label}</span>
                </td>
                {pivot.columns.map((col) => {
                  const tier = row.cells.get(col.key);
                  const qty = tier ? getQty(tier) : 0;
                  return (
                    <td
                      key={col.key}
                      className={`${styles.priceColVisitor} ${qty > 0 ? styles.priceCellSelected : ""}`}
                    >
                      {tier ? (
                        <div className={styles.cellInner}>
                          <div className={styles.qtyStepper}>
                            <button
                              type="button"
                              className={styles.qtyBtn}
                              onClick={() => onChangeQty(tier, -1)}
                              disabled={!canEdit || qty === 0}
                              aria-label={`Decrease ${row.label} ${col.label} quantity`}
                            >
                              <Minus size={12} aria-hidden="true" />
                            </button>
                            <span className={styles.qtyValue}>{qty}</span>
                            <button
                              type="button"
                              className={styles.qtyBtn}
                              onClick={() => onChangeQty(tier, 1)}
                              disabled={!canEdit}
                              aria-label={`Increase ${row.label} ${col.label} quantity`}
                            >
                              <Plus size={12} aria-hidden="true" />
                            </button>
                          </div>
                          <span className={styles.unitPrice}>{formatAmount(tier.amount)} each</span>
                          <span className={styles.lineAmount}>{formatAmount(tier.amount * qty)}</span>
                          {tier.isPrimary && <span className={styles.primaryPill}>Primary</span>}
                        </div>
                      ) : (
                        <span className={styles.priceCellEmpty}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}
