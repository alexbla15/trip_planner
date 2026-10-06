"use client";

import { useState, useEffect, useMemo } from "react";
import { Store, Pencil, Trash2, Loader2, MapPin, X as XIcon } from "lucide-react";
import { ModalShell } from "@/components/Modal";
import { WebsiteLinkButton } from "@/components/WebsiteLinkButton";
import { renderTypeIcon } from "@/components/IconPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useBrands, invalidateBrandsCache, useAttractionTypes, useFoodStyles, useShopStyles } from "@/hooks";
import { updateBrand, deleteBrand, getAttractionsByBrand } from "@/services";
import type { Attraction } from "@/types/attraction";
import styles from "./BrandModal.module.css";

const HEADING_ID = "brand-modal-title";

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  /** Called after the brand is deleted — callers whose own view shows this brand (e.g. an
   *  attraction card) should clear whatever they were tracking for it. Optional since not
   *  every caller (e.g. the Admin list, which just re-renders from the invalidated cache)
   *  needs to react beyond that. */
  onDeleted?: () => void;
}

/** Opened from an attraction's "linked to {brand}" chip (AttractionDetailModal/
 *  AttractionGridCard) or from the Admin page's Brands list — shows the brand's defaults
 *  (photo/website/types/food+shop styles every linked attraction falls back to, see
 *  `formatAttraction`'s brand-fallback logic), every attraction currently linked to it
 *  (filterable by country/city), and for an admin, inline edit + delete. Editing here and
 *  editing from Admin both change the one shared Brand doc, so either path is reflected in
 *  the other immediately. */
export function BrandModal({ isOpen, onClose, brandId, onDeleted }: BrandModalProps) {
  const { user, token } = useAuth();
  const toast = useToast();
  const { brands } = useBrands();
  const { types: typeOptions } = useAttractionTypes();
  const { styles: foodStyleOptions } = useFoodStyles();
  const { styles: shopStyleOptions } = useShopStyles();
  const isAdmin = user?.role === "admin";

  const brand = brands.find((b) => b._id === brandId);

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [form, setForm] = useState<{ name: string; photoUrl: string; websiteUrl: string; types: string[]; foodStyles: string[]; shopStyles: string[] }>({
    name: "", photoUrl: "", websiteUrl: "", types: [], foodStyles: [], shopStyles: [],
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Locations list — every attraction linked to this brand, filterable by country/city
  // client-side (the fetch itself is already scoped to brandId alone; a chain's full
  // location list is small enough to not need server-side filtering/pagination).
  const [locations, setLocations] = useState<Attraction[] | null>(null);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [countryFilter, setCountryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  useEffect(() => {
    if (!isOpen) { setEditing(false); setConfirmingDelete(false); return; }
    if (brand) {
      setForm({
        name: brand.name, photoUrl: brand.photoUrl ?? "", websiteUrl: brand.websiteUrl ?? "",
        types: brand.types, foodStyles: brand.foodStyles, shopStyles: brand.shopStyles,
      });
    }
  }, [isOpen, brand]);

  useEffect(() => {
    if (!isOpen) { setLocations(null); setCountryFilter(""); setCityFilter(""); return; }
    let cancelled = false;
    setLocationsLoading(true);
    getAttractionsByBrand(brandId, token)
      .then((data) => { if (!cancelled) setLocations(Array.isArray(data) ? (data as Attraction[]) : []); })
      .catch(() => { if (!cancelled) setLocations([]); })
      .finally(() => { if (!cancelled) setLocationsLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, brandId, token]);

  const countries = useMemo(
    () => [...new Set((locations ?? []).map((a) => a.country).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [locations]
  );
  const citiesInCountry = useMemo(() => {
    const pool = countryFilter ? (locations ?? []).filter((a) => a.country === countryFilter) : (locations ?? []);
    return [...new Set(pool.map((a) => a.city).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b));
  }, [locations, countryFilter]);
  const filteredLocations = useMemo(() => {
    return (locations ?? []).filter((a) =>
      (!countryFilter || a.country === countryFilter) && (!cityFilter || a.city === cityFilter)
    );
  }, [locations, countryFilter, cityFilter]);

  function toggleIn(key: "types" | "foodStyles" | "shopStyles", name: string) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(name) ? prev[key].filter((t) => t !== name) : [...prev[key], name],
    }));
  }

  async function handleSave() {
    if (!token || !form.name.trim()) return;
    setSaving(true);
    try {
      await updateBrand(brandId, token, {
        name: form.name.trim(),
        photoUrl: form.photoUrl.trim(),
        websiteUrl: form.websiteUrl.trim(),
        types: form.types,
        foodStyles: form.foodStyles,
        shopStyles: form.shopStyles,
      });
      invalidateBrandsCache();
      toast.success("Brand updated");
      setEditing(false);
    } catch {
      toast.error("Couldn't update the brand. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteBrand(brandId, token);
      invalidateBrandsCache();
      toast.success("Brand deleted");
      onDeleted?.();
      onClose();
    } catch {
      toast.error("Couldn't delete the brand. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      styles={styles}
      headingId={HEADING_ID}
      header={
        <div className={styles.headerTitle}>
          <Store size={18} className={styles.headerIcon} aria-hidden="true" />
          <h2 id={HEADING_ID} className={styles.title}>{brand?.name ?? "Brand"}</h2>
          {brand && !editing && (
            <div className={styles.headerActions}>
              <WebsiteLinkButton url={brand.websiteUrl} variant="compact" className={styles.headerIconBtn} />
              {isAdmin && (
                <button type="button" className={styles.headerIconBtn} onClick={() => setEditing(true)} aria-label="Edit brand">
                  <Pencil size={15} aria-hidden="true" />
                </button>
              )}
              {isAdmin && (confirmingDelete ? (
                <div className={styles.confirmDelete}>
                  <span>Delete?</span>
                  <button type="button" className={styles.confirmYes} onClick={handleDelete} disabled={deleting}>Yes</button>
                  <button type="button" className={styles.confirmNo} onClick={() => setConfirmingDelete(false)}>No</button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`${styles.headerIconBtn} ${styles.headerIconBtnDanger}`}
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Delete brand"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
        </div>
      }
    >
      {!brand ? (
        <div className={styles.placeholder}><Loader2 size={24} className={styles.spin} /></div>
      ) : editing ? (
        <div className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Name *</label>
            <input
              className={styles.input}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Default photo URL</label>
            <input
              className={styles.input}
              value={form.photoUrl}
              onChange={(e) => setForm((p) => ({ ...p, photoUrl: e.target.value }))}
              placeholder="https://…"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Default website URL</label>
            <input
              className={styles.input}
              value={form.websiteUrl}
              onChange={(e) => setForm((p) => ({ ...p, websiteUrl: e.target.value }))}
              placeholder="https://…"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Default categories/types</label>
            <div className={styles.typeChips}>
              {typeOptions.map((t) => {
                const active = form.types.includes(t.name);
                return (
                  <button
                    key={t._id}
                    type="button"
                    className={`${styles.typeChip} ${active ? styles.typeChipActive : ""}`}
                    aria-pressed={active}
                    onClick={() => toggleIn("types", t.name)}
                  >
                    {renderTypeIcon(t.icon)}
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Default food styles</label>
            <div className={styles.typeChips}>
              {foodStyleOptions.map((f) => {
                const active = form.foodStyles.includes(f.name);
                return (
                  <button
                    key={f._id}
                    type="button"
                    className={`${styles.typeChip} ${active ? styles.typeChipActive : ""}`}
                    aria-pressed={active}
                    onClick={() => toggleIn("foodStyles", f.name)}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Default shop styles</label>
            <div className={styles.typeChips}>
              {shopStyleOptions.map((s) => {
                const active = form.shopStyles.includes(s.name);
                return (
                  <button
                    key={s._id}
                    type="button"
                    className={`${styles.typeChip} ${active ? styles.typeChipActive : ""}`}
                    aria-pressed={active}
                    onClick={() => toggleIn("shopStyles", s.name)}
                  >
                    {renderTypeIcon(s.icon)}
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.view}>
          <div className={styles.photoArea}>
            {brand.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.photoUrl} alt="" className={styles.photoImg} />
            ) : (
              <div className={styles.photoFallback}><Store size={28} aria-hidden="true" /></div>
            )}
          </div>
          {(brand.types.length > 0 || brand.foodStyles.length > 0 || brand.shopStyles.length > 0) && (
            <div className={styles.typeChips}>
              {brand.types.map((t) => {
                const rec = typeOptions.find((o) => o.name === t);
                return <span key={t} className={styles.typeChip}>{rec && renderTypeIcon(rec.icon)}{t}</span>;
              })}
              {brand.foodStyles.map((f) => <span key={f} className={styles.typeChip}>{f}</span>)}
              {brand.shopStyles.map((s) => {
                const rec = shopStyleOptions.find((o) => o.name === s);
                return <span key={s} className={styles.typeChip}>{rec && renderTypeIcon(rec.icon)}{s}</span>;
              })}
            </div>
          )}

          <div className={styles.locationsSection}>
            <h3 className={styles.locationsTitle}>
              Locations {locations ? `(${filteredLocations.length}${filteredLocations.length !== locations.length ? ` of ${locations.length}` : ""})` : ""}
            </h3>

            {locationsLoading ? (
              <div className={styles.placeholder}><Loader2 size={20} className={styles.spin} /></div>
            ) : locations && locations.length > 0 ? (
              <>
                <div className={styles.locationFilters}>
                  <select
                    className={styles.filterSelect}
                    value={countryFilter}
                    onChange={(e) => { setCountryFilter(e.target.value); setCityFilter(""); }}
                    aria-label="Filter locations by country"
                  >
                    <option value="">All countries</option>
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select
                    className={styles.filterSelect}
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    aria-label="Filter locations by city"
                    disabled={citiesInCountry.length === 0}
                  >
                    <option value="">All cities</option>
                    {citiesInCountry.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {(countryFilter || cityFilter) && (
                    <button
                      type="button"
                      className={styles.clearFilterBtn}
                      onClick={() => { setCountryFilter(""); setCityFilter(""); }}
                      aria-label="Clear location filters"
                    >
                      <XIcon size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
                <ul className={styles.locationsList}>
                  {filteredLocations.map((a) => (
                    <li key={a._id} className={styles.locationRow}>
                      <MapPin size={13} aria-hidden="true" className={styles.locationIcon} />
                      <span className={styles.locationName}>{a.name}</span>
                      <span className={styles.locationMeta}>{[a.city, a.country].filter(Boolean).join(", ")}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={styles.hint}>No attractions linked to this brand yet.</p>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}
