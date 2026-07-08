"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Plus, Pencil, Trash2, Check, X as XIcon,
  Loader2, ChevronDown, AlertCircle, Tag, Smile,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAttractionTypes, invalidateAttractionTypesCache } from "@/hooks/useAttractionTypes";
import { useMoodTags, invalidateMoodTagsCache } from "@/hooks/useMoodTags";
import { getIconComponent, renderTypeIcon } from "@/lib/attractionIcons";
import { IconPicker } from "@/components/IconPicker";
import type { AttractionTypeRecord } from "@/types/attractionType";
import type { MoodTagRecord } from "@/types/moodTag";
import styles from "./AdminClient.module.css";

interface TypeFormState {
  name: string;
  category: string;
  icon: string;
  categoryIcon: string;
  color: string;
  subtype: string;
  order: string;
}

const EMPTY_FORM: TypeFormState = {
  name: "", category: "", icon: "Globe", categoryIcon: "Globe",
  color: "#64748B", subtype: "", order: "0",
};

function formStateFromRecord(r: AttractionTypeRecord): TypeFormState {
  return {
    name: r.name, category: r.category, icon: r.icon,
    categoryIcon: r.categoryIcon, color: r.color,
    subtype: r.subtype ?? "", order: String(r.order),
  };
}

// Self-contained form — manages its own saving/error state and calls the API directly.
function TypeForm({
  initial,
  token,
  typeId,          // undefined → create mode, string → update mode
  existingCategories,
  onDone,
  onCancel,
}: {
  initial: TypeFormState;
  token: string;
  typeId?: string;
  existingCategories: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<TypeFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof TypeFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.category.trim() || !form.icon.trim()) {
      setError("Name, category, and icon are required.");
      return;
    }
    setSaving(true);
    setError("");

    const url    = typeId ? `/api/attraction-types/${typeId}` : "/api/attraction-types";
    const method = typeId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: form.name.trim(),
        category: form.category.trim(),
        icon: form.icon.trim(),
        categoryIcon: form.categoryIcon.trim(),
        color: form.color.trim(),
        subtype: form.subtype || null,
        order: parseInt(form.order, 10) || 0,
      }),
    });

    const data = await res.json() as { error?: string };
    if (!res.ok) {
      setError(data.error ?? (typeId ? "Failed to update" : "Failed to create"));
      setSaving(false);
      return;
    }

    invalidateAttractionTypesCache();
    onDone();
  }

  return (
    <div className={styles.formCard}>
      <div className={styles.formGrid}>
        {/* Name */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Name *</label>
          <input
            className={styles.input}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Restaurant"
          />
        </div>

        {/* Category */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Category *</label>
          <input
            className={styles.input}
            list="existing-categories"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="e.g. Food & Drink"
          />
          <datalist id="existing-categories">
            {existingCategories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        {/* Type icon */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Type icon *</label>
          <IconPicker value={form.icon} onChange={(v) => set("icon", v)} />
        </div>

        {/* Category icon */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Category icon *</label>
          <IconPicker value={form.categoryIcon} onChange={(v) => set("categoryIcon", v)} />
        </div>

        {/* Color */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Color *</label>
          <div className={styles.colorRow}>
            <input type="color" className={styles.colorPicker} value={form.color} onChange={(e) => set("color", e.target.value)} />
            <input className={styles.input} value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="#F59E0B" />
          </div>
        </div>

        {/* Subtype */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Subtype</label>
          <div className={styles.selectWrap}>
            <select className={styles.select} value={form.subtype} onChange={(e) => set("subtype", e.target.value)}>
              <option value="">None</option>
              <option value="flight">flight</option>
              <option value="residence">residence</option>
            </select>
            <ChevronDown size={13} className={styles.selectCaret} aria-hidden="true" />
          </div>
        </div>

        {/* Order */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Display order</label>
          <input type="number" className={styles.input} value={form.order} onChange={(e) => set("order", e.target.value)} />
        </div>
      </div>

      {error && (
        <p className={styles.formError}>
          <AlertCircle size={13} aria-hidden="true" /> {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          <XIcon size={14} /> Cancel
        </button>
        <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className={styles.spin} /> : <Check size={14} />}
          {typeId ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
}

interface MoodTagFormState {
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  darkColor: string;
  darkBgColor: string;
  order: string;
}

const EMPTY_MOOD_FORM: MoodTagFormState = {
  name: "", icon: "Globe",
  color: "#888888", bgColor: "#f5f5f5",
  darkColor: "#cccccc", darkBgColor: "#333333",
  order: "0",
};

function moodFormFromRecord(r: MoodTagRecord): MoodTagFormState {
  return {
    name: r.name, icon: r.icon,
    color: r.color, bgColor: r.bgColor,
    darkColor: r.darkColor, darkBgColor: r.darkBgColor,
    order: String(r.order),
  };
}

function MoodTagForm({
  initial, token, tagId, onDone, onCancel,
}: {
  initial: MoodTagFormState;
  token: string;
  tagId?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<MoodTagFormState>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof MoodTagFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim() || !form.icon.trim()) {
      setError("Name and icon are required.");
      return;
    }
    setSaving(true);
    setError("");

    const url    = tagId ? `/api/mood-tags/${tagId}` : "/api/mood-tags";
    const method = tagId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: form.name.trim(),
        icon: form.icon.trim(),
        color: form.color.trim(),
        bgColor: form.bgColor.trim(),
        darkColor: form.darkColor.trim(),
        darkBgColor: form.darkBgColor.trim(),
        order: parseInt(form.order, 10) || 0,
      }),
    });

    const data = await res.json() as { error?: string };
    if (!res.ok) {
      setError(data.error ?? (tagId ? "Failed to update" : "Failed to create"));
      setSaving(false);
      return;
    }

    invalidateMoodTagsCache();
    onDone();
  }

  return (
    <div className={styles.formCard}>
      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Name *</label>
          <input
            className={styles.input}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Adventure"
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Icon *</label>
          <IconPicker value={form.icon} onChange={(v) => set("icon", v)} />
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Text color (light)</label>
          <div className={styles.colorRow}>
            <input type="color" className={styles.colorPicker} value={form.color} onChange={(e) => set("color", e.target.value)} />
            <input className={styles.input} value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="#888888" />
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Background (light)</label>
          <div className={styles.colorRow}>
            <input type="color" className={styles.colorPicker} value={form.bgColor} onChange={(e) => set("bgColor", e.target.value)} />
            <input className={styles.input} value={form.bgColor} onChange={(e) => set("bgColor", e.target.value)} placeholder="#f5f5f5" />
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Text color (dark)</label>
          <div className={styles.colorRow}>
            <input type="color" className={styles.colorPicker} value={form.darkColor} onChange={(e) => set("darkColor", e.target.value)} />
            <input className={styles.input} value={form.darkColor} onChange={(e) => set("darkColor", e.target.value)} placeholder="#cccccc" />
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Background (dark)</label>
          <div className={styles.colorRow}>
            <input type="color" className={styles.colorPicker} value={form.darkBgColor} onChange={(e) => set("darkBgColor", e.target.value)} />
            <input className={styles.input} value={form.darkBgColor} onChange={(e) => set("darkBgColor", e.target.value)} placeholder="#333333" />
          </div>
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel}>Display order</label>
          <input type="number" className={styles.input} value={form.order} onChange={(e) => set("order", e.target.value)} />
        </div>
      </div>

      {error && (
        <p className={styles.formError}>
          <AlertCircle size={13} aria-hidden="true" /> {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          <XIcon size={14} /> Cancel
        </button>
        <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} className={styles.spin} /> : <Check size={14} />}
          {tagId ? "Update" : "Create"}
        </button>
      </div>
    </div>
  );
}

export function AdminClient() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { types, loading: typesLoading, categories, byCategory } = useAttractionTypes();
  const { tags: moodTags, loading: tagsLoading } = useMoodTags();

  // Attraction type CRUD state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding]       = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [deleting, setDeleting]   = useState(false);

  // Mood tag CRUD state
  const [moodEditingId, setMoodEditingId] = useState<string | null>(null);
  const [moodAdding, setMoodAdding]       = useState(false);
  const [moodDeleteId, setMoodDeleteId]   = useState<string | null>(null);
  const [moodDeleting, setMoodDeleting]   = useState(false);
  const [seeding, setSeeding]             = useState(false);

  const loading = authLoading || typesLoading;

  if (loading || !user) {
    return (
      <div className={styles.center}>
        <Loader2 size={32} className={styles.spin} />
      </div>
    );
  }

  if (user.role !== "admin") {
    router.replace("/");
    return null;
  }

  async function handleDelete(id: string) {
    if (!token) return;
    setDeleting(true);
    await fetch(`/api/attraction-types/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    invalidateAttractionTypesCache();
    window.location.reload();
  }

  function handleFormDone() {
    setAdding(false);
    setEditingId(null);
    window.location.reload();
  }

  async function handleMoodDelete(id: string) {
    if (!token) return;
    setMoodDeleting(true);
    await fetch(`/api/mood-tags/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    invalidateMoodTagsCache();
    window.location.reload();
  }

  function handleMoodFormDone() {
    setMoodAdding(false);
    setMoodEditingId(null);
    window.location.reload();
  }

  async function handleSeedMoodTags() {
    if (!token) return;
    setSeeding(true);
    await fetch("/api/mood-tags/seed", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    invalidateMoodTagsCache();
    window.location.reload();
  }

  return (
    <main className={styles.page}>
      {/* Hero */}
      <div className={styles.heroSection}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Manager Panel</h1>
          <p className={styles.heroSubtitle}>Manage attraction types and categories available to all users.</p>
        </div>
      </div>

      <div className={styles.content}>
        {/* Types card */}
        <div className={styles.card}>
          {/* Section heading row */}
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionIconCircle} aria-hidden="true">
              <Tag size={18} />
            </div>
            <h2 className={styles.sectionHeading}>Attraction Types ({types.length})</h2>
            {!adding && !editingId && (
              <button className={styles.addBtn} onClick={() => setAdding(true)}>
                <Plus size={14} aria-hidden="true" /> Add type
              </button>
            )}
          </div>

          {/* Add-new form */}
          {adding && token && (
            <TypeForm
              key="new"
              initial={EMPTY_FORM}
              token={token}
              existingCategories={categories}
              onDone={handleFormDone}
              onCancel={() => setAdding(false)}
            />
          )}

          {/* Types grouped by category */}
          {typesLoading ? (
            <div className={styles.center}><Loader2 size={24} className={styles.spin} /></div>
          ) : (
            <div className={styles.categoriesList}>
              {categories.map((cat) => (
                <section key={cat} className={styles.categorySection}>
                  <div className={styles.categoryHeader}>
                    {(() => {
                      const first = byCategory[cat]?.[0];
                      const CatIcon = getIconComponent(first?.categoryIcon ?? "Globe");
                      return (
                        <>
                          <span className={styles.categoryDot} style={{ background: first?.color }} />
                          <CatIcon size={16} aria-hidden="true" />
                          <h3 className={styles.categoryName}>{cat}</h3>
                          <span className={styles.categoryCount}>{byCategory[cat]?.length}</span>
                        </>
                      );
                    })()}
                  </div>

                  <div className={styles.typesList}>
                    {(byCategory[cat] ?? []).map((typeRecord) => (
                      <div key={typeRecord._id} className={styles.typeRow}>
                        {editingId === typeRecord._id && token ? (
                          <TypeForm
                            key={typeRecord._id}
                            initial={formStateFromRecord(typeRecord)}
                            token={token}
                            typeId={typeRecord._id}
                            existingCategories={categories}
                            onDone={handleFormDone}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <div className={styles.typeItem}>
                            <span className={styles.typeIcon}>{renderTypeIcon(typeRecord.icon, 15)}</span>
                            <span className={styles.typeName}>{typeRecord.name}</span>
                            {typeRecord.subtype && (
                              <span className={styles.subtypeBadge}>{typeRecord.subtype}</span>
                            )}
                            <span className={styles.typeOrder}>#{typeRecord.order}</span>
                            <div className={styles.typeActions}>
                              <button
                                className={styles.iconBtn}
                                onClick={() => { setEditingId(typeRecord._id); setAdding(false); }}
                                aria-label={`Edit ${typeRecord.name}`}
                              >
                                <Pencil size={13} />
                              </button>
                              {deleteId === typeRecord._id ? (
                                <div className={styles.confirmDelete}>
                                  <span>Delete?</span>
                                  <button
                                    className={styles.confirmYes}
                                    onClick={() => handleDelete(typeRecord._id)}
                                    disabled={deleting}
                                  >
                                    Yes
                                  </button>
                                  <button className={styles.confirmNo} onClick={() => setDeleteId(null)}>
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className={`${styles.iconBtn} ${styles.deleteBtn}`}
                                  onClick={() => setDeleteId(typeRecord._id)}
                                  aria-label={`Delete ${typeRecord.name}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Mood Tags card */}
        <div className={styles.card}>
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionIconCircle} aria-hidden="true">
              <Smile size={18} />
            </div>
            <h2 className={styles.sectionHeading}>Travel Moods ({moodTags.length})</h2>
            {!moodAdding && !moodEditingId && (
              <>
                <button className={styles.addBtn} onClick={() => setMoodAdding(true)}>
                  <Plus size={14} aria-hidden="true" /> Add mood
                </button>
                {moodTags.length === 0 && (
                  <button className={styles.addBtn} onClick={handleSeedMoodTags} disabled={seeding}>
                    {seeding ? <Loader2 size={14} className={styles.spin} /> : <Plus size={14} />}
                    Seed defaults
                  </button>
                )}
              </>
            )}
          </div>

          {moodAdding && token && (
            <MoodTagForm
              key="new-mood"
              initial={EMPTY_MOOD_FORM}
              token={token}
              onDone={handleMoodFormDone}
              onCancel={() => setMoodAdding(false)}
            />
          )}

          {tagsLoading ? (
            <div className={styles.center}><Loader2 size={24} className={styles.spin} /></div>
          ) : (
            <div className={styles.typesList}>
              {moodTags.map((tagRecord) => (
                <div key={tagRecord._id} className={styles.typeRow}>
                  {moodEditingId === tagRecord._id && token ? (
                    <MoodTagForm
                      key={tagRecord._id}
                      initial={moodFormFromRecord(tagRecord)}
                      token={token}
                      tagId={tagRecord._id}
                      onDone={handleMoodFormDone}
                      onCancel={() => setMoodEditingId(null)}
                    />
                  ) : (
                    <div className={styles.typeItem}>
                      <span className={styles.typeIcon}>{renderTypeIcon(tagRecord.icon, 15)}</span>
                      <span className={styles.typeName}>{tagRecord.name}</span>
                      <span
                        className={styles.moodOrderBadge}
                        style={{ "--badge-color": tagRecord.color, "--badge-bg": tagRecord.bgColor } as React.CSSProperties}
                      >
                        #{tagRecord.order}
                      </span>
                      <div className={styles.typeActions}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => { setMoodEditingId(tagRecord._id); setMoodAdding(false); }}
                          aria-label={`Edit ${tagRecord.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                        {moodDeleteId === tagRecord._id ? (
                          <div className={styles.confirmDelete}>
                            <span>Delete?</span>
                            <button
                              className={styles.confirmYes}
                              onClick={() => handleMoodDelete(tagRecord._id)}
                              disabled={moodDeleting}
                            >
                              Yes
                            </button>
                            <button className={styles.confirmNo} onClick={() => setMoodDeleteId(null)}>
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            className={`${styles.iconBtn} ${styles.deleteBtn}`}
                            onClick={() => setMoodDeleteId(tagRecord._id)}
                            aria-label={`Delete ${tagRecord.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
