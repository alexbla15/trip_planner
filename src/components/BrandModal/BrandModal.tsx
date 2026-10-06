"use client";

import { useState, useEffect } from "react";
import { Store, Globe, Pencil, Loader2 } from "lucide-react";
import { ModalShell } from "@/components/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useBrands, invalidateBrandsCache, useAttractionTypes, type BrandRecord } from "@/hooks";
import { updateBrand } from "@/services";
import styles from "./BrandModal.module.css";

const HEADING_ID = "brand-modal-title";

interface BrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
}

/** Opened from an attraction's "linked to {brand}" chip (AttractionDetailModal/
 *  AttractionGridCard) — shows the brand's defaults (photo/website/types every attraction
 *  linked to it falls back to, see `formatAttraction`'s brand-fallback logic) and, for an
 *  admin, an inline edit form that saves via the same PUT /api/brands/:id AdminClient's own
 *  Brands section uses — editing here and editing from Admin both end up changing the one
 *  shared Brand doc, so either path is reflected in the other immediately. */
export function BrandModal({ isOpen, onClose, brandId }: BrandModalProps) {
  const { user, token } = useAuth();
  const toast = useToast();
  const { brands } = useBrands();
  const { types: typeOptions } = useAttractionTypes();
  const isAdmin = user?.role === "admin";

  const brand = brands.find((b) => b._id === brandId);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ name: string; photoUrl: string; websiteUrl: string; types: string[] }>({
    name: "", photoUrl: "", websiteUrl: "", types: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) { setEditing(false); return; }
    if (brand) {
      setForm({ name: brand.name, photoUrl: brand.photoUrl ?? "", websiteUrl: brand.websiteUrl ?? "", types: brand.types });
    }
  }, [isOpen, brand]);

  function toggleType(name: string) {
    setForm((prev) => ({
      ...prev,
      types: prev.types.includes(name) ? prev.types.filter((t) => t !== name) : [...prev.types, name],
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
                    onClick={() => toggleType(t.name)}
                  >
                    {t.name}
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
          {brand.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.photoUrl} alt="" className={styles.photo} />
          )}
          {brand.websiteUrl && (
            <a href={brand.websiteUrl} target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
              <Globe size={14} aria-hidden="true" />
              {brand.websiteUrl}
            </a>
          )}
          <p className={styles.hint}>
            Every attraction linked to this brand falls back to its photo/types/website
            above whenever it doesn&apos;t have its own — editing it here updates every
            linked attraction that relies on the default.
          </p>
          {brand.types.length > 0 && (
            <div className={styles.typeChips}>
              {brand.types.map((t) => (
                <span key={t} className={styles.typeChip}>{t}</span>
              ))}
            </div>
          )}
          {isAdmin && (
            <button type="button" className={styles.editBtn} onClick={() => setEditing(true)}>
              <Pencil size={14} aria-hidden="true" />
              Edit brand
            </button>
          )}
        </div>
      )}
    </ModalShell>
  );
}
