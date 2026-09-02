"use client";

import { useState, useEffect } from "react";
import { Plus, X, Check, Calendar } from "lucide-react";
import type { PriceTabDraft, PrimaryCellRef, PriceGridRowDraft } from "./attraction.types";
import { nextDraftId, emptyPriceTab } from "./NewAttractionModal.utils";
import styles from "./PriceTierEditor.module.css";

const DAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type DaysMode = "any" | "weekday" | "weekend" | "custom";

function getDaysMode(days: string[]): DaysMode {
  if (days.length === 0) return "any";
  if (days.length === 1) {
    if (days[0] === "weekday") return "weekday";
    if (days[0] === "weekend") return "weekend";
  }
  return "custom";
}

function getDaysSummary(days: string[]): string {
  const mode = getDaysMode(days);
  if (mode === "any") return "Any day";
  if (mode === "weekday") return "Weekdays";
  if (mode === "weekend") return "Weekends";
  if (days.length === 0) return "Select days";
  return days.map((d) => d.slice(0, 3)).join(", ");
}

function daysForMode(mode: "any" | "weekday" | "weekend"): string[] {
  return mode === "any" ? [] : [mode];
}

interface PriceTierEditorProps {
  tabs: PriceTabDraft[];
  onChange: (tabs: PriceTabDraft[]) => void;
  primary: PrimaryCellRef | null;
  onPrimaryChange: (ref: PrimaryCellRef) => void;
  currency: string;
}

/** Tab-first price editor: the user first defines the available product tabs (e.g.
 *  "Galaxy", "Entry"), then per tab enters that tab's tiers (rows) and visitor types
 *  (columns) — prices are edited directly in the resulting grid. Mirrors the read-only
 *  Tier x Visitor Type pivot table in AttractionDetailModal, just editable. */
export function PriceTierEditor({ tabs, onChange, primary, onPrimaryChange, currency }: PriceTierEditorProps) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const [daysPopupRowId, setDaysPopupRowId] = useState<string | null>(null);

  // Keeps the active tab in sync when `tabs` is replaced wholesale (e.g. the modal was
  // reopened for a different attraction, or the active tab itself was just removed) —
  // otherwise activeTabId would keep pointing at an id that no longer exists.
  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTabId)) {
      setActiveTabId(tabs[0]?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs]);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  function updateTab(tabId: string, updater: (tab: PriceTabDraft) => PriceTabDraft) {
    onChange(tabs.map((t) => (t.id === tabId ? updater(t) : t)));
  }

  function addTab() {
    const tab = emptyPriceTab();
    onChange([...tabs, tab]);
    setActiveTabId(tab.id);
  }

  function removeTab(tabId: string) {
    const next = tabs.filter((t) => t.id !== tabId);
    onChange(next.length ? next : [emptyPriceTab()]);
    if (activeTabId === tabId) setActiveTabId(next[0]?.id ?? "");
  }

  function renameTab(tabId: string, product: string) {
    updateTab(tabId, (tab) => ({ ...tab, product }));
  }

  function addColumn(tabId: string) {
    updateTab(tabId, (tab) => {
      const columnId = nextDraftId("col");
      return {
        ...tab,
        columns: [...tab.columns, { id: columnId, visitorType: "" }],
        rows: tab.rows.map((row) => ({ ...row, cells: { ...row.cells, [columnId]: null } })),
      };
    });
  }

  function renameColumn(tabId: string, columnId: string, visitorType: string) {
    updateTab(tabId, (tab) => ({
      ...tab,
      columns: tab.columns.map((c) => (c.id === columnId ? { ...c, visitorType } : c)),
    }));
  }

  function removeColumn(tabId: string, columnId: string) {
    updateTab(tabId, (tab) => ({
      ...tab,
      columns: tab.columns.filter((c) => c.id !== columnId),
      rows: tab.rows.map((row) => {
        const cells = { ...row.cells };
        delete cells[columnId];
        return { ...row, cells };
      }),
    }));
  }

  function addRow(tabId: string) {
    updateTab(tabId, (tab) => ({
      ...tab,
      rows: [
        ...tab.rows,
        {
          id: nextDraftId("row"),
          label: "",
          days: [],
          cells: Object.fromEntries(tab.columns.map((c) => [c.id, null])),
        },
      ],
    }));
  }

  function renameRow(tabId: string, rowId: string, label: string) {
    updateTab(tabId, (tab) => ({
      ...tab,
      rows: tab.rows.map((r) => (r.id === rowId ? { ...r, label } : r)),
    }));
  }

  function removeRow(tabId: string, rowId: string) {
    updateTab(tabId, (tab) => ({ ...tab, rows: tab.rows.filter((r) => r.id !== rowId) }));
  }

  function setCell(tabId: string, rowId: string, columnId: string, amount: number | null) {
    updateTab(tabId, (tab) => ({
      ...tab,
      rows: tab.rows.map((r) => (r.id === rowId ? { ...r, cells: { ...r.cells, [columnId]: amount } } : r)),
    }));
  }

  function setRowDays(tabId: string, rowId: string, days: string[]) {
    updateTab(tabId, (tab) => ({
      ...tab,
      rows: tab.rows.map((r) => (r.id === rowId ? { ...r, days } : r)),
    }));
  }

  function toggleDayInRow(tabId: string, row: PriceGridRowDraft, day: string) {
    const days = row.days.includes(day) ? row.days.filter((d) => d !== day) : [...row.days, day];
    setRowDays(tabId, row.id, days);
  }

  if (!activeTab) return null;

  return (
    <div className={styles.editor}>
      {/* Step 1: product tabs */}
      <div className={styles.tabStrip} role="tablist" aria-label="Price tabs">
        {tabs.map((tab, i) => (
          <div key={tab.id} className={`${styles.tab} ${tab.id === activeTabId ? styles.tabActive : ""}`}>
            <input
              type="text"
              role="tab"
              aria-selected={tab.id === activeTabId}
              value={tab.product}
              placeholder={`Tab ${i + 1}`}
              onFocus={() => setActiveTabId(tab.id)}
              onClick={() => setActiveTabId(tab.id)}
              onChange={(e) => renameTab(tab.id, e.target.value)}
              className={styles.tabInput}
              aria-label={`Tab ${i + 1} name`}
            />
            {tabs.length > 1 && (
              <button
                type="button"
                className={styles.tabRemoveBtn}
                onClick={() => removeTab(tab.id)}
                aria-label={`Remove tab ${tab.product || i + 1}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </div>
        ))}
        <button type="button" className={styles.addTabBtn} onClick={addTab}>
          <Plus size={13} aria-hidden="true" />
          Add tab
        </button>
      </div>

      {/* Step 2 & 3: this tab's tiers (rows) and visitor types (columns), step 4: grid */}
      <div className={styles.gridScroll}>
        <table className={styles.grid}>
          <thead>
            <tr>
              <th className={styles.cornerCell}>Tier</th>
              {activeTab.columns.map((col, i) => (
                <th key={col.id} className={styles.columnHeaderCell}>
                  <div className={styles.columnHeaderInner}>
                    <input
                      type="text"
                      value={col.visitorType}
                      placeholder={`Visitor ${i + 1}`}
                      onChange={(e) => renameColumn(activeTab.id, col.id, e.target.value)}
                      className={styles.columnInput}
                      aria-label={`Visitor type ${i + 1} name`}
                    />
                    {activeTab.columns.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeColumn(activeTab.id, col.id)}
                        aria-label={`Remove visitor type ${col.visitorType || i + 1}`}
                      >
                        <X size={11} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className={styles.addColumnCell}>
                <button
                  type="button"
                  className={styles.addGridBtn}
                  onClick={() => addColumn(activeTab.id)}
                  aria-label="Add visitor type column"
                >
                  <Plus size={13} aria-hidden="true" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {activeTab.rows.map((row, i) => (
              <tr key={row.id}>
                <td className={styles.rowHeaderCell}>
                  <div className={styles.rowHeaderInner}>
                    <input
                      type="text"
                      value={row.label}
                      placeholder={`Tier ${i + 1}`}
                      onChange={(e) => renameRow(activeTab.id, row.id, e.target.value)}
                      className={styles.rowInput}
                      aria-label={`Tier ${i + 1} name`}
                    />
                    <button
                      type="button"
                      className={styles.daysTriggerBtn}
                      onClick={() => setDaysPopupRowId(row.id)}
                      aria-haspopup="dialog"
                      aria-expanded={daysPopupRowId === row.id}
                      title="Set which days this tier applies to"
                    >
                      <Calendar size={12} aria-hidden="true" />
                      <span className={styles.daysTriggerText}>{getDaysSummary(row.days)}</span>
                    </button>
                    {activeTab.rows.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => removeRow(activeTab.id, row.id)}
                        aria-label={`Remove tier ${row.label || i + 1}`}
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {daysPopupRowId === row.id && (
                    <>
                      <div className={styles.daysOverlay} onClick={() => setDaysPopupRowId(null)} />
                      <div className={styles.daysPopup}>
                        <div className={styles.daysPopupHeader}>
                          <span className={styles.daysPopupTitle}>Days for &ldquo;{row.label || `Tier ${i + 1}`}&rdquo;</span>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => setDaysPopupRowId(null)}
                            aria-label="Close"
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </div>
                        <div className={styles.daysModeButtons}>
                          {(["any", "weekday", "weekend"] as const).map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              className={`${styles.daysModeBtn} ${getDaysMode(row.days) === mode ? styles.daysModeBtnActive : ""}`}
                              onClick={() => setRowDays(activeTab.id, row.id, daysForMode(mode))}
                              aria-pressed={getDaysMode(row.days) === mode}
                            >
                              {mode === "any" ? "Any day" : mode === "weekday" ? "Weekdays" : "Weekends"}
                            </button>
                          ))}
                        </div>
                        <div className={styles.daysPopupDivider}>
                          <span>or pick specific days</span>
                        </div>
                        <div className={styles.daysCheckboxes}>
                          {DAY_OPTIONS.map((day) => (
                            <label key={day} className={styles.dayCheckboxLabel}>
                              <input
                                type="checkbox"
                                checked={row.days.includes(day)}
                                onChange={() => toggleDayInRow(activeTab.id, row, day)}
                              />
                              {day}
                            </label>
                          ))}
                        </div>
                        <div className={styles.daysPopupFooter}>
                          <button type="button" className={styles.daysPopupDoneBtn} onClick={() => setDaysPopupRowId(null)}>
                            Done
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </td>
                {activeTab.columns.map((col) => {
                  const isPrimary = primary?.tabId === activeTab.id && primary?.rowId === row.id && primary?.columnId === col.id;
                  return (
                    <td key={col.id} className={styles.priceCell}>
                      <button
                        type="button"
                        className={`${styles.primaryBtn} ${isPrimary ? styles.primaryBtnActive : ""}`}
                        onClick={() => onPrimaryChange({ tabId: activeTab.id, rowId: row.id, columnId: col.id })}
                        title={isPrimary ? "Primary rate" : "Set as primary rate"}
                        aria-pressed={isPrimary}
                        aria-label={isPrimary ? "Primary rate" : "Set as primary rate"}
                      >
                        <Check size={11} aria-hidden="true" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.cells[col.id] ?? ""}
                        onChange={(e) => setCell(activeTab.id, row.id, col.id, e.target.value === "" ? null : parseFloat(e.target.value))}
                        className={styles.priceInput}
                        aria-label={`Price for ${row.label || "tier"}, ${col.visitorType || "visitor type"} (${currency})`}
                      />
                    </td>
                  );
                })}
                <td className={styles.addColumnCell} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className={styles.addGridRowBtn} onClick={() => addRow(activeTab.id)}>
        <Plus size={14} aria-hidden="true" />
        Add tier
      </button>
    </div>
  );
}
