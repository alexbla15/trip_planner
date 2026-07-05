"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DollarSign, Plus, Trash2, Loader2, AlertCircle, Check } from "lucide-react";
import { currencySymbol } from "@/lib/formatCurrency";
import type { Trip, TripExpense } from "@/types/trip";
import type { Attraction } from "@/types/attraction";
import styles from "./ExpensesPanel.module.css";

const DISPLAY_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "KRW", name: "South Korean Won" },
  { code: "THB", name: "Thai Baht" },
  { code: "AED", name: "UAE Dirham" },
  { code: "HUF", name: "Hungarian Forint" },
];

type Tab = "attractions" | "flights" | "residences";

interface ExpensesPanelProps {
  trip: Trip;
  attractions: Attraction[];
  canEdit: boolean;
  token: string | null;
  onTripUpdate: (updated: Trip) => void;
  onAttractionsChange: (updated: Attraction[]) => void;
}

interface LocalExpense {
  id: string;
  label: string;
  amountStr: string;
  attractionId?: string;
  subtype?: "flight" | "residence";
}

let nextTempId = 0;
function tempId() { return `new-${++nextTempId}`; }

function buildLocal(trip: Trip, attractions: Attraction[]): LocalExpense[] {
  const saved = trip.expenses ?? [];
  const savedByAttrId = new Map(
    saved.filter((e) => e.attractionId).map((e) => [e.attractionId!, e])
  );
  // Include ALL attractions with a price — regular, flights, and residences
  const attractionRows: LocalExpense[] = attractions
    .filter((a) => a.price != null)
    .map((a) => {
      const override = savedByAttrId.get(a._id);
      return {
        id:           override?._id ?? tempId(),
        label:        a.name,
        amountStr:    String(override?.amount ?? a.price ?? 0),
        attractionId: a._id,
        subtype:      a.subtype as "flight" | "residence" | undefined,
      };
    });
  const customRows: LocalExpense[] = saved
    .filter((e) => !e.attractionId)
    .map((e) => ({ id: e._id, label: e.label, amountStr: String(e.amount) }));
  return [...attractionRows, ...customRows];
}

function applyRate(rows: LocalExpense[], rate: number): LocalExpense[] {
  return rows.map((r) => ({
    ...r,
    amountStr: (Math.round((parseFloat(r.amountStr) || 0) * rate * 100) / 100).toFixed(2),
  }));
}

function toApiExpenses(rows: LocalExpense[]): Omit<TripExpense, "_id">[] {
  return rows
    .filter((r) => r.label.trim())
    .map((r) => ({
      label:        r.label.trim(),
      amount:       Math.max(0, parseFloat(r.amountStr) || 0),
      attractionId: r.attractionId,
    }));
}

export function ExpensesPanel({
  trip, attractions, canEdit, token, onTripUpdate,
}: ExpensesPanelProps) {
  const tripCurrency = trip.currency ?? "USD";

  const [rows,             setRows]             = useState<LocalExpense[]>(() => buildLocal(trip, attractions));
  const [activeTab,        setActiveTab]        = useState<Tab>("attractions");
  const [selectedCurrency, setSelectedCurrency] = useState(tripCurrency);
  const [currentRate,      setCurrentRate]      = useState(1);
  const [converting,       setConverting]       = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [error,            setError]            = useState("");
  const [saved,            setSaved]            = useState(false);

  const rateRef = useRef(1);
  useEffect(() => { rateRef.current = currentRate; }, [currentRate]);

  useEffect(() => {
    setSelectedCurrency(tripCurrency);
    setCurrentRate(1);
    rateRef.current = 1;
    setRows(buildLocal(trip, attractions));
  }, [trip._id, tripCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedCurrency === tripCurrency) {
      setCurrentRate(1);
      rateRef.current = 1;
      setRows(buildLocal(trip, attractions));
      return;
    }
    let cancelled = false;
    setConverting(true);
    fetch(`/api/fx?from=${encodeURIComponent(tripCurrency)}&to=${encodeURIComponent(selectedCurrency)}`)
      .then((r) => r.json())
      .then((d: { rate?: number; error?: string }) => {
        if (cancelled) return;
        if (!d.rate) {
          setError(d.error ?? "Could not fetch exchange rate.");
          setSelectedCurrency(tripCurrency);
          return;
        }
        setCurrentRate(d.rate);
        rateRef.current = d.rate;
        setRows(applyRate(buildLocal(trip, attractions), d.rate));
      })
      .catch(() => {
        if (!cancelled) {
          setError("Failed to fetch exchange rate.");
          setSelectedCurrency(tripCurrency);
        }
      })
      .finally(() => { if (!cancelled) setConverting(false); });
    return () => { cancelled = true; };
  }, [selectedCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fresh = buildLocal(trip, attractions);
    setRows(rateRef.current !== 1 ? applyRate(fresh, rateRef.current) : fresh);
  }, [attractions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Partition rows by subtype for tab display
  const attractionRows = rows.filter((r) => r.attractionId && !r.subtype);
  const flightRows     = rows.filter((r) => r.attractionId && r.subtype === "flight");
  const residenceRows  = rows.filter((r) => r.attractionId && r.subtype === "residence");
  const customRows     = rows.filter((r) => !r.attractionId);

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "attractions", label: "Attractions", count: attractionRows.length },
    { id: "flights",     label: "Flights",     count: flightRows.length     },
    { id: "residences",  label: "Residences",  count: residenceRows.length  },
  ];

  const activeRows =
    activeTab === "attractions" ? attractionRows :
    activeTab === "flights"     ? flightRows     : residenceRows;

  const total = rows.reduce((sum, r) => sum + (parseFloat(r.amountStr) || 0), 0);
  const sym   = currencySymbol(selectedCurrency) || selectedCurrency;

  const isCurrencyChanged = selectedCurrency !== tripCurrency;
  const budgetInDisplay   = trip.budget != null
    ? Math.round(trip.budget * currentRate * 100) / 100
    : null;
  const budgetDelta = budgetInDisplay != null ? budgetInDisplay - total : null;

  function updateRow(id: string, patch: Partial<LocalExpense>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  function addCustomRow() {
    setRows((prev) => [...prev, { id: tempId(), label: "", amountStr: "0" }]);
    setSaved(false);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSaved(false);
  }

  // Saves ONLY to trip.expenses — never mutates attraction prices or currencies.
  const handleSave = useCallback(async () => {
    if (!token) return;
    setSaving(true); setError("");
    try {
      const [expRes, tripRes] = await Promise.all([
        fetch(`/api/trips/${trip._id}/expenses`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ expenses: toApiExpenses(rows) }),
        }),
        isCurrencyChanged
          ? fetch(`/api/trips/${trip._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                currency: selectedCurrency,
                ...(trip.budget != null
                  ? { budget: Math.round(trip.budget * currentRate) }
                  : {}),
              }),
            })
          : Promise.resolve(null),
      ]);

      if (!expRes.ok) {
        setError((await expRes.json()).error ?? "Failed to save expenses");
        return;
      }

      const updatedTrip: Trip =
        tripRes && tripRes.ok
          ? ((await tripRes.json()) as Trip)
          : ((await expRes.json()) as Trip);
      onTripUpdate(updatedTrip);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [token, trip._id, trip.budget, rows, currentRate, selectedCurrency, isCurrencyChanged, onTripUpdate]);

  const fmt = (n: number) =>
    `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className={styles.card}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.iconCircle} aria-hidden="true">
            <DollarSign size={16} />
          </span>
          <h2 className={styles.heading}>Expenses</h2>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.currencySelectWrap}>
            {converting && (
              <Loader2 size={13} className={styles.convertSpinner} aria-hidden="true" />
            )}
            <select
              value={selectedCurrency}
              onChange={(e) => { setSelectedCurrency(e.target.value); setSaved(false); setError(""); }}
              className={styles.currencySelect}
              disabled={converting || saving}
              aria-label="Display currency"
            >
              {!DISPLAY_CURRENCIES.find((c) => c.code === tripCurrency) && (
                <option value={tripCurrency}>{tripCurrency}</option>
              )}
              {DISPLAY_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {canEdit && (
            <button
              type="button"
              className={`${styles.saveBtn} ${isCurrencyChanged ? styles.saveBtnAccent : ""}`}
              onClick={handleSave}
              disabled={saving || converting}
              aria-label={isCurrencyChanged ? `Save and convert trip to ${selectedCurrency}` : "Save expenses"}
            >
              {saving ? (
                <Loader2 size={14} className={styles.spinner} aria-hidden="true" />
              ) : saved ? (
                <Check size={14} aria-hidden="true" />
              ) : null}
              {saving ? "Saving…" : saved ? "Saved" : isCurrencyChanged ? `Save in ${selectedCurrency}` : "Save"}
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className={styles.tabs} role="tablist" aria-label="Expense categories">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`${styles.tabBadge} ${activeTab === tab.id ? styles.tabBadgeActive : ""}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab panel ── */}
      <section className={styles.section} role="tabpanel">
        {activeRows.length === 0 ? (
          <p className={styles.empty}>
            No {activeTab} with prices added to this trip.
          </p>
        ) : (
          <div className={styles.rows}>
            {activeRows.map((row) => (
              <div key={row.id} className={styles.row}>
                <span className={styles.rowLabel}>{row.label}</span>
                {canEdit ? (
                  <div className={styles.amountCell}>
                    {sym && <span className={styles.currSym}>{sym}</span>}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.amountStr}
                      onChange={(e) => updateRow(row.id, { amountStr: e.target.value })}
                      className={styles.amountInput}
                      aria-label={`Budgeted amount for ${row.label}`}
                    />
                  </div>
                ) : (
                  <span className={styles.amountStatic}>{fmt(parseFloat(row.amountStr) || 0)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Other Expenses ── */}
      <section className={styles.section}>
        <div className={styles.sectionHeadRow}>
          <h3 className={styles.sectionLabel}>Other Expenses</h3>
          {canEdit && (
            <button type="button" className={styles.addBtn} onClick={addCustomRow} aria-label="Add expense">
              <Plus size={13} aria-hidden="true" />
              Add
            </button>
          )}
        </div>

        {customRows.length === 0 ? (
          <p className={styles.empty}>
            {canEdit ? "No custom expenses yet — click Add to create one." : "No other expenses recorded."}
          </p>
        ) : (
          <div className={styles.rows}>
            {customRows.map((row) => (
              <div key={row.id} className={styles.row}>
                {canEdit ? (
                  <>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateRow(row.id, { label: e.target.value })}
                      placeholder="Description"
                      className={styles.labelInput}
                      aria-label="Expense description"
                    />
                    <div className={styles.amountCell}>
                      {sym && <span className={styles.currSym}>{sym}</span>}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.amountStr}
                        onChange={(e) => updateRow(row.id, { amountStr: e.target.value })}
                        className={styles.amountInput}
                        aria-label={`Amount for ${row.label || "expense"}`}
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeRow(row.id)}
                      aria-label={`Remove ${row.label || "expense"}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={styles.rowLabel}>{row.label}</span>
                    <span className={styles.amountStatic}>{fmt(parseFloat(row.amountStr) || 0)}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <div className={styles.footer}>
        {isCurrencyChanged && (
          <p className={styles.conversionNote}>
            Showing values converted from {tripCurrency} · Save to make this the trip currency.
          </p>
        )}
        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Total spent</span>
          <span className={styles.totalValue}>{fmt(total)}</span>
        </div>
        {budgetInDisplay != null && budgetDelta != null && (
          <div className={`${styles.deltaRow} ${budgetDelta < 0 ? styles.over : styles.under}`}>
            <span className={styles.deltaLabel}>
              {budgetDelta < 0 ? "Over budget by" : "Remaining budget"}
            </span>
            <span className={styles.deltaValue}>{fmt(Math.abs(budgetDelta))}</span>
          </div>
        )}
        {error && (
          <p className={styles.error} role="alert">
            <AlertCircle size={12} aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
