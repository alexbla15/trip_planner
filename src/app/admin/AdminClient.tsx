"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Plus, Pencil, Trash2,
  Loader2, ChevronDown, Tag, Smile, Layers, RefreshCw, UtensilsCrossed,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  useAttractionTypes,
  invalidateAttractionTypesCache,
  useAttractionCategories,
  invalidateAttractionCategoriesCache,
  useMoodTags,
  invalidateMoodTagsCache,
  getMoodTagStyle,
  useFoodStyles,
  invalidateFoodStylesCache,
} from "@/hooks";
import {
  createAttractionType,
  updateAttractionType,
  deleteAttractionType,
  createAttractionCategory,
  updateAttractionCategory,
  deleteAttractionCategory,
  migrateLegacyTypes,
  createMoodTag,
  updateMoodTag,
  deleteMoodTag,
  seedMoodTags,
  createFoodStyle,
  updateFoodStyle,
  deleteFoodStyle,
  ApiError,
} from "@/services";
import { getIconComponent, renderTypeIcon, IconPicker, SectionCard } from "@/components";
import {
  type TypeFormState,
  type CategoryFormState,
  type MoodTagFormState,
  type FoodStyleFormState,
  typeFormFromRecord,
  catFormFromRecord,
  moodFormFromRecord,
  foodStyleFormFromRecord,
} from "@/lib";
import type { AttractionCategoryRecord } from "@/types/attractionCategory";
import { AdminEntityForm } from "./AdminEntityForm";
import styles from "./AdminClient.module.css";

// ── Attraction Type form ───────────────────────────────────────────────────────

const EMPTY_TYPE_FORM: TypeFormState = {
  name: "", categoryId: "", icon: "Globe", subtype: "",
};

function TypeForm({
  initial,
  token,
  typeId,
  availableCategories,
  onDone,
  onCancel,
}: {
  initial: TypeFormState;
  token: string;
  typeId?: string;
  availableCategories: AttractionCategoryRecord[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<TypeFormState>(initial);

  function set(key: keyof TypeFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.name.trim() || !form.categoryId.trim() || !form.icon.trim()) {
      return "Name, category, and icon are required.";
    }
    return null;
  }

  async function handleSave() {
    const payload = {
      name:       form.name.trim(),
      categoryId: form.categoryId.trim(),
      icon:       form.icon.trim(),
      subtype:    form.subtype || null,
    };
    if (typeId) await updateAttractionType(typeId, token, payload);
    else await createAttractionType(token, payload);
    invalidateAttractionTypesCache();
  }

  return (
    <AdminEntityForm validate={validate} onSave={handleSave} onDone={onDone} onCancel={onCancel} isEditing={!!typeId}>
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
        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={form.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
          >
            <option value="">— select a category —</option>
            {availableCategories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={13} className={styles.selectCaret} aria-hidden="true" />
        </div>
        {availableCategories.length === 0 && (
          <p className={styles.fieldHint}>No categories yet — create one in the Categories section first.</p>
        )}
      </div>

      {/* Type icon */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>Icon *</label>
        <IconPicker value={form.icon} onChange={(v) => set("icon", v)} />
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
    </AdminEntityForm>
  );
}

// ── Attraction Category form ───────────────────────────────────────────────────

const EMPTY_CAT_FORM: CategoryFormState = {
  name: "", icon: "Globe", color: "#64748B",
};

function CategoryForm({
  initial,
  token,
  catId,
  onDone,
  onCancel,
}: {
  initial: CategoryFormState;
  token: string;
  catId?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CategoryFormState>(initial);

  function set(key: keyof CategoryFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.name.trim() || !form.icon.trim() || !form.color.trim()) {
      return "Name, icon, and color are required.";
    }
    return null;
  }

  async function handleSave() {
    const payload = {
      name:  form.name.trim(),
      icon:  form.icon.trim(),
      color: form.color.trim(),
    };
    if (catId) await updateAttractionCategory(catId, token, payload);
    else await createAttractionCategory(token, payload);
    invalidateAttractionCategoriesCache();
    invalidateAttractionTypesCache();
  }

  return (
    <AdminEntityForm validate={validate} onSave={handleSave} onDone={onDone} onCancel={onCancel} isEditing={!!catId}>
      <div className={styles.formField}>
        <label className={styles.formLabel}>Name *</label>
        <input
          className={styles.input}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Food & Drink"
        />
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Icon *</label>
        <IconPicker value={form.icon} onChange={(v) => set("icon", v)} />
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Color *</label>
        <div className={styles.colorRow}>
          <input type="color" className={styles.colorPicker} value={form.color} onChange={(e) => set("color", e.target.value)} />
          <input className={styles.input} value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="#F59E0B" />
        </div>
      </div>
    </AdminEntityForm>
  );
}

// ── Food Style form ────────────────────────────────────────────────────────────

const EMPTY_FOOD_STYLE_FORM: FoodStyleFormState = { name: "" };

function FoodStyleForm({
  initial, token, styleId, onDone, onCancel,
}: {
  initial: FoodStyleFormState;
  token: string;
  styleId?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FoodStyleFormState>(initial);

  function validate(): string | null {
    if (!form.name.trim()) return "Name is required.";
    return null;
  }

  async function handleSave() {
    const payload = { name: form.name.trim() };
    if (styleId) await updateFoodStyle(styleId, token, payload);
    else await createFoodStyle(token, payload);
    invalidateFoodStylesCache();
  }

  return (
    <AdminEntityForm validate={validate} onSave={handleSave} onDone={onDone} onCancel={onCancel} isEditing={!!styleId}>
      <div className={styles.formField}>
        <label className={styles.formLabel}>Name *</label>
        <input
          className={styles.input}
          value={form.name}
          onChange={(e) => setForm({ name: e.target.value })}
          placeholder="e.g. Sushi"
        />
      </div>
    </AdminEntityForm>
  );
}

// ── Mood Tag form ──────────────────────────────────────────────────────────────

const EMPTY_MOOD_FORM: MoodTagFormState = {
  name: "", icon: "Globe",
  color: "#888888", bgColor: "#f5f5f5",
  darkColor: "#cccccc", darkBgColor: "#333333",
};

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

  function set(key: keyof MoodTagFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.name.trim() || !form.icon.trim()) {
      return "Name and icon are required.";
    }
    return null;
  }

  async function handleSave() {
    const payload = {
      name: form.name.trim(),
      icon: form.icon.trim(),
      color: form.color.trim(),
      bgColor: form.bgColor.trim(),
      darkColor: form.darkColor.trim(),
      darkBgColor: form.darkBgColor.trim(),
    };
    if (tagId) await updateMoodTag(tagId, token, payload);
    else await createMoodTag(token, payload);
    invalidateMoodTagsCache();
  }

  return (
    <AdminEntityForm validate={validate} onSave={handleSave} onDone={onDone} onCancel={onCancel} isEditing={!!tagId}>
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
    </AdminEntityForm>
  );
}

// ── Main admin component ───────────────────────────────────────────────────────

export function AdminClient() {
  const { user, token, loading: authLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { types, loading: typesLoading, categories, byCategory } = useAttractionTypes();
  const { categories: catRecords, loading: catsLoading } = useAttractionCategories();
  const { tags: moodTags, loading: tagsLoading } = useMoodTags();
  const { styles: foodStyleRecords, loading: foodStylesLoading } = useFoodStyles();
  const [collapsedTypeCategories, setCollapsedTypeCategories] = useState<Set<string>>(new Set());

  function toggleTypeCategory(cat: string) {
    setCollapsedTypeCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Category CRUD state
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catAdding, setCatAdding]       = useState(false);
  const [catDeleteId, setCatDeleteId]   = useState<string | null>(null);
  const [catDeleting, setCatDeleting]   = useState(false);
  const [migrating, setMigrating]       = useState(false);
  const [migrateMsg, setMigrateMsg]     = useState("");

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

  // Food style CRUD state
  const [foodStyleEditingId, setFoodStyleEditingId] = useState<string | null>(null);
  const [foodStyleAdding, setFoodStyleAdding]       = useState(false);
  const [foodStyleDeleteId, setFoodStyleDeleteId]   = useState<string | null>(null);
  const [foodStyleDeleting, setFoodStyleDeleting]   = useState(false);

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

  // ── Category handlers ────────────────────────────────────────────────────────

  async function handleCatDelete(id: string) {
    if (!token) return;
    setCatDeleting(true);
    try {
      await deleteAttractionCategory(id, token);
    } catch (err) {
      const body = err instanceof ApiError ? (err.body as { error?: string } | null) : null;
      alert(body?.error ?? "Failed to delete category");
      setCatDeleting(false);
      setCatDeleteId(null);
      return;
    }
    invalidateAttractionCategoriesCache();
    invalidateAttractionTypesCache();
    setCatDeleting(false);
    setCatDeleteId(null);
    toast.success("Category deleted");
  }

  function handleCatFormDone() {
    const wasEditing = catEditingId !== null;
    setCatAdding(false);
    setCatEditingId(null);
    toast.success(wasEditing ? "Category updated" : "Category created");
  }

  async function handleMigrate() {
    if (!token) return;
    setMigrating(true);
    setMigrateMsg("");
    const res = await migrateLegacyTypes(token);
    const data = await res.json() as { message?: string };
    setMigrateMsg(data.message ?? "Done.");
    setMigrating(false);
    invalidateAttractionCategoriesCache();
    invalidateAttractionTypesCache();
    toast.success(data.message ?? "Legacy types migrated");
  }

  // ── Type handlers ────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!token) return;
    setDeleting(true);
    await deleteAttractionType(id, token);
    invalidateAttractionTypesCache();
    setDeleting(false);
    setDeleteId(null);
    toast.success("Type deleted");
  }

  function handleFormDone() {
    const wasEditing = editingId !== null;
    setAdding(false);
    setEditingId(null);
    toast.success(wasEditing ? "Type updated" : "Type created");
  }

  // ── Mood tag handlers ────────────────────────────────────────────────────────

  async function handleMoodDelete(id: string) {
    if (!token) return;
    setMoodDeleting(true);
    await deleteMoodTag(id, token);
    invalidateMoodTagsCache();
    setMoodDeleting(false);
    setMoodDeleteId(null);
    toast.success("Mood deleted");
  }

  function handleMoodFormDone() {
    const wasEditing = moodEditingId !== null;
    setMoodAdding(false);
    setMoodEditingId(null);
    toast.success(wasEditing ? "Mood updated" : "Mood created");
  }

  // ── Food style handlers ──────────────────────────────────────────────────────

  async function handleFoodStyleDelete(id: string) {
    if (!token) return;
    setFoodStyleDeleting(true);
    await deleteFoodStyle(id, token);
    invalidateFoodStylesCache();
    setFoodStyleDeleting(false);
    setFoodStyleDeleteId(null);
    toast.success("Food style deleted");
  }

  function handleFoodStyleFormDone() {
    const wasEditing = foodStyleEditingId !== null;
    setFoodStyleAdding(false);
    setFoodStyleEditingId(null);
    toast.success(wasEditing ? "Food style updated" : "Food style created");
  }

  async function handleSeedMoodTags() {
    if (!token) return;
    setSeeding(true);
    await seedMoodTags(token);
    invalidateMoodTagsCache();
    setSeeding(false);
    toast.success("Default moods seeded");
  }

  // ── Legacy types that haven't been migrated yet ──────────────────────────────
  const legacyTypes = types.filter((t) => !t.categoryId);

  return (
    <main className={styles.page}>
      {/* Hero */}
      <div className={styles.heroSection}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Manager Panel</h1>
          <p className={styles.heroSubtitle}>Manage attraction categories, types, and travel moods available to all users.</p>
        </div>
      </div>

      <div className={styles.content}>
        {/* ── Categories card ────────────────────────────────────────────────── */}
        <SectionCard
          icon={Layers}
          title="Attraction Categories"
          headingCount={catRecords.length}
          collapsible
          actions={
            !catAdding && !catEditingId && (
              <>
                <button className={styles.addBtn} onClick={() => setCatAdding(true)} aria-label="Add category">
                  <Plus size={14} aria-hidden="true" /> <span className={styles.addBtnLabel}>Add category</span>
                </button>
                {legacyTypes.length > 0 && (
                  <button
                    className={styles.addBtn}
                    onClick={handleMigrate}
                    disabled={migrating}
                    aria-label={`Migrate legacy (${legacyTypes.length})`}
                  >
                    {migrating ? <Loader2 size={14} className={styles.spin} /> : <RefreshCw size={14} aria-hidden="true" />}
                    <span className={styles.addBtnLabel}>Migrate legacy ({legacyTypes.length})</span>
                  </button>
                )}
              </>
            )
          }
        >
          {migrateMsg && (
            <p className={styles.fieldHint}>{migrateMsg}</p>
          )}

          {catAdding && token && (
            <CategoryForm
              key="new-cat"
              initial={EMPTY_CAT_FORM}
              token={token}
              onDone={handleCatFormDone}
              onCancel={() => setCatAdding(false)}
            />
          )}

          {catsLoading ? (
            <div className={styles.center}><Loader2 size={24} className={styles.spin} /></div>
          ) : catRecords.length === 0 ? (
            <p className={styles.fieldHint}>No categories yet. Add one or use "Migrate legacy" if you have existing types.</p>
          ) : (
            <div className={styles.typesList}>
              {catRecords.map((cat) => (
                <div key={cat._id} className={styles.typeRow}>
                  {catEditingId === cat._id && token ? (
                    <CategoryForm
                      key={cat._id}
                      initial={catFormFromRecord(cat)}
                      token={token}
                      catId={cat._id}
                      onDone={handleCatFormDone}
                      onCancel={() => setCatEditingId(null)}
                    />
                  ) : (
                    <div className={styles.typeItem}>
                      <span className={styles.typeIcon}>{renderTypeIcon(cat.icon, 15)}</span>
                      <span
                        className={styles.typeNameColored}
                        style={{ "--type-color": cat.color } as CSSProperties}
                      >
                        {cat.name}
                      </span>
                      <div className={styles.typeActions}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => { setCatEditingId(cat._id); setCatAdding(false); }}
                          aria-label={`Edit ${cat.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                        {catDeleteId === cat._id ? (
                          <div className={styles.confirmDelete}>
                            <span>Delete?</span>
                            <button
                              className={styles.confirmYes}
                              onClick={() => handleCatDelete(cat._id)}
                              disabled={catDeleting}
                            >
                              Yes
                            </button>
                            <button className={styles.confirmNo} onClick={() => setCatDeleteId(null)}>
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            className={`${styles.iconBtn} ${styles.deleteBtn}`}
                            onClick={() => setCatDeleteId(cat._id)}
                            aria-label={`Delete ${cat.name}`}
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
        </SectionCard>

        {/* ── Types card ─────────────────────────────────────────────────────── */}
        <SectionCard
          icon={Tag}
          title="Attraction Types"
          headingCount={types.length}
          collapsible
          actions={
            !adding && !editingId && (
              <button className={styles.addBtn} onClick={() => setAdding(true)} aria-label="Add type">
                <Plus size={14} aria-hidden="true" /> <span className={styles.addBtnLabel}>Add type</span>
              </button>
            )
          }
        >
          {adding && token && (
            <TypeForm
              key="new"
              initial={EMPTY_TYPE_FORM}
              token={token}
              availableCategories={catRecords}
              onDone={handleFormDone}
              onCancel={() => setAdding(false)}
            />
          )}

          {typesLoading ? (
            <div className={styles.center}><Loader2 size={24} className={styles.spin} /></div>
          ) : (
            <div className={styles.categoriesList}>
              {categories.map((cat) => {
                const isOpen = !collapsedTypeCategories.has(cat);
                const bodyId = `type-category-body-${cat.replace(/\s+/g, "-")}`;
                const first = byCategory[cat]?.[0];
                const CatIcon = getIconComponent(first?.categoryIcon ?? "Globe");
                return (
                  <section key={cat} className={styles.categorySection}>
                    <button
                      type="button"
                      className={styles.categoryHeader}
                      onClick={() => toggleTypeCategory(cat)}
                      aria-expanded={isOpen}
                      aria-controls={bodyId}
                    >
                      <CatIcon size={16} aria-hidden="true" />
                      <h3
                        className={styles.categoryNameColored}
                        style={{ "--type-color": first?.color } as CSSProperties}
                      >
                        {cat}
                      </h3>
                      <span className={styles.categoryCount}>{byCategory[cat]?.length}</span>
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className={`${styles.categoryChevron}${isOpen ? "" : ` ${styles.categoryChevronCollapsed}`}`}
                      />
                    </button>

                    <div className={`${styles.categoryCollapse}${isOpen ? "" : ` ${styles.categoryCollapseClosed}`}`}>
                      <div className={styles.categoryCollapseInner} id={bodyId}>
                        <div className={styles.typesList}>
                          {(byCategory[cat] ?? []).map((typeRecord) => (
                            <div key={typeRecord._id} className={styles.typeRow}>
                              {editingId === typeRecord._id && token ? (
                                <TypeForm
                                  key={typeRecord._id}
                                  initial={typeFormFromRecord(typeRecord)}
                                  token={token}
                                  typeId={typeRecord._id}
                                  availableCategories={catRecords}
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
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Mood Tags card ─────────────────────────────────────────────────── */}
        <SectionCard
          icon={Smile}
          title="Travel Moods"
          headingCount={moodTags.length}
          collapsible
          actions={
            !moodAdding && !moodEditingId && (
              <>
                <button className={styles.addBtn} onClick={() => setMoodAdding(true)} aria-label="Add mood">
                  <Plus size={14} aria-hidden="true" /> <span className={styles.addBtnLabel}>Add mood</span>
                </button>
                {moodTags.length === 0 && (
                  <button
                    className={styles.addBtn}
                    onClick={handleSeedMoodTags}
                    disabled={seeding}
                    aria-label="Seed defaults"
                  >
                    {seeding ? <Loader2 size={14} className={styles.spin} /> : <Plus size={14} aria-hidden="true" />}
                    <span className={styles.addBtnLabel}>Seed defaults</span>
                  </button>
                )}
              </>
            )
          }
        >
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
                      <span className={styles.moodIcon} style={getMoodTagStyle(tagRecord)}>
                        {renderTypeIcon(tagRecord.icon, 15)}
                      </span>
                      <span className={styles.moodName} style={getMoodTagStyle(tagRecord)}>{tagRecord.name}</span>
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
        </SectionCard>

        {/* ── Food Styles card ───────────────────────────────────────────────── */}
        <SectionCard
          icon={UtensilsCrossed}
          title="Food Styles"
          headingCount={foodStyleRecords.length}
          collapsible
          actions={
            !foodStyleAdding && !foodStyleEditingId && (
              <button className={styles.addBtn} onClick={() => setFoodStyleAdding(true)} aria-label="Add food style">
                <Plus size={14} aria-hidden="true" /> <span className={styles.addBtnLabel}>Add food style</span>
              </button>
            )
          }
        >
          {foodStyleAdding && token && (
            <FoodStyleForm
              key="new-food-style"
              initial={EMPTY_FOOD_STYLE_FORM}
              token={token}
              onDone={handleFoodStyleFormDone}
              onCancel={() => setFoodStyleAdding(false)}
            />
          )}

          {foodStylesLoading ? (
            <div className={styles.center}><Loader2 size={24} className={styles.spin} /></div>
          ) : (
            <div className={styles.typesList}>
              {foodStyleRecords.map((record) => (
                <div key={record._id} className={styles.typeRow}>
                  {foodStyleEditingId === record._id && token ? (
                    <FoodStyleForm
                      key={record._id}
                      initial={foodStyleFormFromRecord(record)}
                      token={token}
                      styleId={record._id}
                      onDone={handleFoodStyleFormDone}
                      onCancel={() => setFoodStyleEditingId(null)}
                    />
                  ) : (
                    <div className={styles.typeItem}>
                      <span className={styles.typeName}>{record.name}</span>
                      <div className={styles.typeActions}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => { setFoodStyleEditingId(record._id); setFoodStyleAdding(false); }}
                          aria-label={`Edit ${record.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                        {foodStyleDeleteId === record._id ? (
                          <div className={styles.confirmDelete}>
                            <span>Delete?</span>
                            <button
                              className={styles.confirmYes}
                              onClick={() => handleFoodStyleDelete(record._id)}
                              disabled={foodStyleDeleting}
                            >
                              Yes
                            </button>
                            <button className={styles.confirmNo} onClick={() => setFoodStyleDeleteId(null)}>
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            className={`${styles.iconBtn} ${styles.deleteBtn}`}
                            onClick={() => setFoodStyleDeleteId(record._id)}
                            aria-label={`Delete ${record.name}`}
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
        </SectionCard>
      </div>
    </main>
  );
}
