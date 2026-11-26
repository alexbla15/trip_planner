"use client";

import { useState, useEffect, useId } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Plus, Pencil, Trash2,
  Loader2, ChevronDown, Tag, Smile, Layers, RefreshCw, UtensilsCrossed, ShoppingBag, Store,
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
  useShopStyles,
  invalidateShopStylesCache,
  useBrands,
  invalidateBrandsCache,
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
  createShopStyle,
  updateShopStyle,
  deleteShopStyle,
  createBrand,
  updateBrand,
  deleteBrand,
  fetchStaleBrandCopies,
  clearStaleBrandCopies,
  ApiError,
} from "@/services";
import { getIconComponent, renderTypeIcon, IconPicker, SectionCard, BrandModal } from "@/components";
import {
  type TypeFormState,
  type CategoryFormState,
  type MoodTagFormState,
  type FoodStyleFormState,
  type ShopStyleFormState,
  typeFormFromRecord,
  catFormFromRecord,
  moodFormFromRecord,
  foodStyleFormFromRecord,
  shopStyleFormFromRecord,
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
  const uid = useId();

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
        <label htmlFor={`${uid}-name`} className={styles.formLabel}>Name *</label>
        <input
          id={`${uid}-name`}
          className={styles.input}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Restaurant"
        />
      </div>

      {/* Category */}
      <div className={styles.formField}>
        <label htmlFor={`${uid}-category`} className={styles.formLabel}>Category *</label>
        <div className={styles.selectWrap}>
          <select
            id={`${uid}-category`}
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
        <span id={`${uid}-icon`} className={styles.formLabel}>Icon *</span>
        <div role="group" aria-labelledby={`${uid}-icon`}>
          <IconPicker value={form.icon} onChange={(v) => set("icon", v)} />
        </div>
      </div>

      {/* Subtype */}
      <div className={styles.formField}>
        <label htmlFor={`${uid}-subtype`} className={styles.formLabel}>Subtype</label>
        <div className={styles.selectWrap}>
          <select id={`${uid}-subtype`} className={styles.select} value={form.subtype} onChange={(e) => set("subtype", e.target.value)}>
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
  const uid = useId();

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
        <label htmlFor={`${uid}-name`} className={styles.formLabel}>Name *</label>
        <input
          id={`${uid}-name`}
          className={styles.input}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Food & Drink"
        />
      </div>

      <div className={styles.formField}>
        <span id={`${uid}-icon`} className={styles.formLabel}>Icon *</span>
        <div role="group" aria-labelledby={`${uid}-icon`}>
          <IconPicker value={form.icon} onChange={(v) => set("icon", v)} />
        </div>
      </div>

      <div className={styles.formField}>
        <label htmlFor={`${uid}-color`} className={styles.formLabel}>Color *</label>
        <div className={styles.colorRow}>
          <input type="color" className={styles.colorPicker} value={form.color} onChange={(e) => set("color", e.target.value)} />
          <input className={styles.input} value={form.color} onChange={(e) => set("color", e.target.value)} id={`${uid}-color`} placeholder="#F59E0B" />
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
  const uid = useId();

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
        <label htmlFor={`${uid}-name`} className={styles.formLabel}>Name *</label>
        <input
          id={`${uid}-name`}
          className={styles.input}
          value={form.name}
          onChange={(e) => setForm({ name: e.target.value })}
          placeholder="e.g. Sushi"
        />
      </div>
    </AdminEntityForm>
  );
}

// ── Shop Style form ────────────────────────────────────────────────────────────

const EMPTY_SHOP_STYLE_FORM: ShopStyleFormState = { name: "", icon: "ShoppingBag" };

function ShopStyleForm({
  initial, token, styleId, onDone, onCancel,
}: {
  initial: ShopStyleFormState;
  token: string;
  styleId?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ShopStyleFormState>(initial);
  const uid = useId();

  function set(key: keyof ShopStyleFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.name.trim() || !form.icon.trim()) {
      return "Name and icon are required.";
    }
    return null;
  }

  async function handleSave() {
    const payload = { name: form.name.trim(), icon: form.icon.trim() };
    if (styleId) await updateShopStyle(styleId, token, payload);
    else await createShopStyle(token, payload);
    invalidateShopStylesCache();
  }

  return (
    <AdminEntityForm validate={validate} onSave={handleSave} onDone={onDone} onCancel={onCancel} isEditing={!!styleId}>
      <div className={styles.formField}>
        <label htmlFor={`${uid}-name`} className={styles.formLabel}>Name *</label>
        <input
          id={`${uid}-name`}
          className={styles.input}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Fashion"
        />
      </div>

      <div className={styles.formField}>
        <span id={`${uid}-icon`} className={styles.formLabel}>Icon *</span>
        <div role="group" aria-labelledby={`${uid}-icon`}>
          <IconPicker value={form.icon} onChange={(v) => set("icon", v)} />
        </div>
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
  const uid = useId();

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
        <label htmlFor={`${uid}-name`} className={styles.formLabel}>Name *</label>
        <input
          id={`${uid}-name`}
          className={styles.input}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Adventure"
        />
      </div>

      <div className={styles.formField}>
        <span id={`${uid}-icon`} className={styles.formLabel}>Icon *</span>
        <div role="group" aria-labelledby={`${uid}-icon`}>
          <IconPicker value={form.icon} onChange={(v) => set("icon", v)} />
        </div>
      </div>

      <div className={styles.formField}>
        <label htmlFor={`${uid}-color-light`} className={styles.formLabel}>Text color (light)</label>
        <div className={styles.colorRow}>
          <input type="color" className={styles.colorPicker} value={form.color} onChange={(e) => set("color", e.target.value)} />
          <input className={styles.input} value={form.color} onChange={(e) => set("color", e.target.value)} id={`${uid}-color-light`} placeholder="#888888" />
        </div>
      </div>

      <div className={styles.formField}>
        <label htmlFor={`${uid}-bg-light`} className={styles.formLabel}>Background (light)</label>
        <div className={styles.colorRow}>
          <input type="color" className={styles.colorPicker} value={form.bgColor} onChange={(e) => set("bgColor", e.target.value)} />
          <input className={styles.input} value={form.bgColor} onChange={(e) => set("bgColor", e.target.value)} id={`${uid}-bg-light`} placeholder="#f5f5f5" />
        </div>
      </div>

      <div className={styles.formField}>
        <label htmlFor={`${uid}-color-dark`} className={styles.formLabel}>Text color (dark)</label>
        <div className={styles.colorRow}>
          <input type="color" className={styles.colorPicker} value={form.darkColor} onChange={(e) => set("darkColor", e.target.value)} />
          <input className={styles.input} value={form.darkColor} onChange={(e) => set("darkColor", e.target.value)} id={`${uid}-color-dark`} placeholder="#cccccc" />
        </div>
      </div>

      <div className={styles.formField}>
        <label htmlFor={`${uid}-bg-dark`} className={styles.formLabel}>Background (dark)</label>
        <div className={styles.colorRow}>
          <input type="color" className={styles.colorPicker} value={form.darkBgColor} onChange={(e) => set("darkBgColor", e.target.value)} />
          <input className={styles.input} value={form.darkBgColor} onChange={(e) => set("darkBgColor", e.target.value)} id={`${uid}-bg-dark`} placeholder="#333333" />
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
  const { styles: shopStyleRecords, loading: shopStylesLoading } = useShopStyles();
  const { brands: brandRecords, loading: brandsLoading } = useBrands();
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
  const [confirmingMigrate, setConfirmingMigrate] = useState(false);

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
  // Set when the server refuses a delete because attractions still use the style; the inline
  // prompt then asks for a second, explicit confirmation before forcing the delete.
  const [foodStyleForce, setFoodStyleForce]         = useState<{ id: string; name: string; message: string } | null>(null);

  // Shop style CRUD state
  const [shopStyleEditingId, setShopStyleEditingId] = useState<string | null>(null);
  const [shopStyleAdding, setShopStyleAdding]       = useState(false);
  const [shopStyleDeleteId, setShopStyleDeleteId]   = useState<string | null>(null);
  const [shopStyleDeleting, setShopStyleDeleting]   = useState(false);

  // Brand CRUD state — add/edit both go through BrandModal's own popup (create mode for
  // adding, its built-in edit pencil for an existing one); this page only tracks which
  // instance to open.
  const [brandDeleteId, setBrandDeleteId]   = useState<string | null>(null);
  const [brandDeleting, setBrandDeleting]   = useState(false);
  const [viewingBrandId, setViewingBrandId] = useState<string | null>(null);
  const [addingBrand, setAddingBrand]       = useState(false);
  // Attractions still holding their own copy of brand types/styles (should be none — they
  // live-fall-back to the brand). Refreshed whenever the brand list changes.
  const [staleBrandCopies, setStaleBrandCopies] = useState(0);
  const [clearingStaleCopies, setClearingStaleCopies] = useState(false);
  const [confirmingCleanup, setConfirmingCleanup]     = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchStaleBrandCopies(token)
      .then((n) => { if (!cancelled) setStaleBrandCopies(n); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, brandRecords]);

  // Non-admins are sent home. Done in an effect: calling router.replace during render is a
  // side effect that React warns about and can repeat on every render.
  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") router.replace("/");
  }, [authLoading, user, router]);

  async function handleClearStaleCopies() {
    if (!token) return;
    setConfirmingCleanup(false);
    setClearingStaleCopies(true);
    try {
      const cleared = await clearStaleBrandCopies(token);
      setStaleBrandCopies(0);
      toast.success(`Cleared ${cleared} stale copies`);
    } catch {
      toast.error("Couldn't clean up. Please try again.");
    } finally {
      setClearingStaleCopies(false);
    }
  }

  const loading = authLoading || typesLoading;

  if (loading || !user) {
    return (
      <div className={styles.center}>
        <Loader2 size={32} className={styles.spin} />
      </div>
    );
  }

  // Non-admins are redirected by the effect above; render nothing meanwhile.
  if (user.role !== "admin") return null;

  // ── Category handlers ────────────────────────────────────────────────────────

  async function handleCatDelete(id: string, name: string) {
    if (!token) return;
    setCatDeleting(true);
    try {
      await deleteAttractionCategory(id, token);
      invalidateAttractionCategoriesCache();
      invalidateAttractionTypesCache();
      setCatDeleteId(null);
      toast.success("Category deleted");
    } catch (err) {
      const body = err instanceof ApiError ? (err.body as { error?: string } | null) : null;
      toast.error(body?.error ?? `Couldn't delete "${name}". Please try again.`);
      setCatDeleteId(null);
    } finally {
      setCatDeleting(false);
    }
  }

  function handleCatFormDone() {
    const wasEditing = catEditingId !== null;
    setCatAdding(false);
    setCatEditingId(null);
    toast.success(wasEditing ? "Category updated" : "Category created");
  }

  async function handleMigrate() {
    if (!token) return;
    setConfirmingMigrate(false);
    setMigrating(true);
    setMigrateMsg("");
    try {
      const res = await migrateLegacyTypes(token);
      if (!res.ok) throw new Error(`Migration failed (${res.status})`);
      const data = await res.json() as { message?: string };
      setMigrateMsg(data.message ?? "Done.");
      toast.success(data.message ?? "Legacy types migrated");
    } catch {
      toast.error("Couldn't migrate legacy types. Please try again.");
    } finally {
      invalidateAttractionCategoriesCache();
      invalidateAttractionTypesCache();
      setMigrating(false);
    }
  }

  // ── Type handlers ────────────────────────────────────────────────────────────

  async function handleDelete(id: string, name: string) {
    if (!token) return;
    setDeleting(true);
    try {
      const res = await deleteAttractionType(id, token);
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      invalidateAttractionTypesCache();
      setDeleteId(null);
      toast.success("Type deleted");
    } catch {
      toast.error(`Couldn't delete "${name}". Please try again.`);
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  function handleFormDone() {
    const wasEditing = editingId !== null;
    setAdding(false);
    setEditingId(null);
    toast.success(wasEditing ? "Type updated" : "Type created");
  }

  // ── Mood tag handlers ────────────────────────────────────────────────────────

  async function handleMoodDelete(id: string, name: string) {
    if (!token) return;
    setMoodDeleting(true);
    try {
      const res = await deleteMoodTag(id, token);
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      invalidateMoodTagsCache();
      setMoodDeleteId(null);
      toast.success("Mood deleted");
    } catch {
      toast.error(`Couldn't delete "${name}". Please try again.`);
      setMoodDeleteId(null);
    } finally {
      setMoodDeleting(false);
    }
  }

  function handleMoodFormDone() {
    const wasEditing = moodEditingId !== null;
    setMoodAdding(false);
    setMoodEditingId(null);
    toast.success(wasEditing ? "Mood updated" : "Mood created");
  }

  // ── Food style handlers ──────────────────────────────────────────────────────

  async function handleFoodStyleDelete(id: string, name: string, force = false) {
    if (!token) return;
    setFoodStyleDeleting(true);
    try {
      const res = await deleteFoodStyle(id, token, force);
      // Still used by attractions: the server refuses until the admin confirms the removal.
      // Ask inline (same Yes/No pattern) rather than with window.confirm.
      if (res.status === 409 && !force) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setFoodStyleForce({
          id,
          name,
          message: body?.error ?? `"${name}" is still used by attractions. Delete it anyway?`,
        });
        setFoodStyleDeleteId(null);
        return;
      }
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      invalidateFoodStylesCache();
      setFoodStyleDeleteId(null);
      setFoodStyleForce(null);
      toast.success("Food style deleted");
    } catch {
      toast.error(`Couldn't delete "${name}". Please try again.`);
      setFoodStyleDeleteId(null);
      setFoodStyleForce(null);
    } finally {
      setFoodStyleDeleting(false);
    }
  }

  function handleFoodStyleFormDone() {
    const wasEditing = foodStyleEditingId !== null;
    setFoodStyleAdding(false);
    setFoodStyleEditingId(null);
    toast.success(wasEditing ? "Food style updated" : "Food style created");
  }

  // ── Shop style handlers ──────────────────────────────────────────────────────

  async function handleShopStyleDelete(id: string, name: string) {
    if (!token) return;
    setShopStyleDeleting(true);
    try {
      const res = await deleteShopStyle(id, token);
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      invalidateShopStylesCache();
      setShopStyleDeleteId(null);
      toast.success("Shop style deleted");
    } catch {
      toast.error(`Couldn't delete "${name}". Please try again.`);
      setShopStyleDeleteId(null);
    } finally {
      setShopStyleDeleting(false);
    }
  }

  function handleShopStyleFormDone() {
    const wasEditing = shopStyleEditingId !== null;
    setShopStyleAdding(false);
    setShopStyleEditingId(null);
    toast.success(wasEditing ? "Shop style updated" : "Shop style created");
  }

  // ── Brand handlers ───────────────────────────────────────────────────────────

  async function handleBrandDelete(id: string, name: string) {
    if (!token) return;
    setBrandDeleting(true);
    try {
      const res = await deleteBrand(id, token);
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      invalidateBrandsCache();
      setBrandDeleteId(null);
      toast.success("Brand deleted");
    } catch {
      toast.error(`Couldn't delete "${name}". Please try again.`);
      setBrandDeleteId(null);
    } finally {
      setBrandDeleting(false);
    }
  }

  async function handleSeedMoodTags() {
    if (!token) return;
    setSeeding(true);
    try {
      const res = await seedMoodTags(token);
      if (!res.ok) throw new Error(`Seed failed (${res.status})`);
      toast.success("Default moods seeded");
    } catch {
      toast.error("Couldn't seed the default moods. Please try again.");
    } finally {
      invalidateMoodTagsCache();
      setSeeding(false);
    }
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
          defaultOpen={true}
          actions={
            !catAdding && !catEditingId && (
              <>
                <button className={styles.addBtn} onClick={() => setCatAdding(true)} aria-label="Add category" title="Add category">
                  <Plus size={14} aria-hidden="true" /> <span className={styles.addBtnLabel}>Add category</span>
                </button>
                {legacyTypes.length > 0 && (
                  <button
                    className={styles.addBtn}
                    onClick={() => setConfirmingMigrate(true)}
                    disabled={migrating || confirmingMigrate}
                    aria-label={`Migrate legacy (${legacyTypes.length})`}
                    title={`Migrate legacy (${legacyTypes.length})`}
                  >
                    {migrating ? <Loader2 size={14} className={styles.spin} /> : <RefreshCw size={14} aria-hidden="true" />}
                    <span className={styles.addBtnLabel}>Migrate legacy ({legacyTypes.length})</span>
                  </button>
                )}
              </>
            )
          }
        >
          {confirmingMigrate && (
            <div className={styles.inlineConfirm} role="group" aria-label="Confirm migration">
              <span>Migrate {legacyTypes.length} legacy {legacyTypes.length === 1 ? "type" : "types"} into categories?</span>
              <div className={styles.inlineConfirmActions}>
                <button type="button" className={styles.confirmYes} onClick={handleMigrate} disabled={migrating}>
                  Yes
                </button>
                <button type="button" className={styles.confirmNo} onClick={() => setConfirmingMigrate(false)}>
                  No
                </button>
              </div>
            </div>
          )}

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
            <div className={styles.compactGrid}>
              {catRecords.map((cat, index) => (
                catEditingId === cat._id && token ? (
                  <div key={cat._id} className={styles.compactFormWrap}>
                    <CategoryForm
                      key={cat._id}
                      initial={catFormFromRecord(cat)}
                      token={token}
                      catId={cat._id}
                      onDone={handleCatFormDone}
                      onCancel={() => setCatEditingId(null)}
                    />
                  </div>
                ) : (
                  <div key={cat._id} className={styles.compactChip}>
                    <span className={styles.compactIndex}>#{index + 1}</span>
                    <span className={styles.typeIcon}>{renderTypeIcon(cat.icon, 15)}</span>
                    <span className={styles.typeNameColored}>
                      <span
                        className={styles.colorSwatch}
                        style={{ "--type-color": cat.color } as CSSProperties}
                        aria-hidden="true"
                      />
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
                          <span className={styles.confirmLabel} title={`Delete ${cat.name}?`}>Delete {cat.name}?</span>
                          <button
                            className={styles.confirmYes}
                            onClick={() => handleCatDelete(cat._id, cat.name)}
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
                )
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
          defaultOpen={true}
          actions={
            !adding && !editingId && (
              <button className={styles.addBtn} onClick={() => setAdding(true)} aria-label="Add type" title="Add type">
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
                      <h3 className={styles.categoryNameColored}>
                        <span
                          className={styles.colorSwatch}
                          style={{ "--type-color": first?.color } as CSSProperties}
                          aria-hidden="true"
                        />
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
                                        <span className={styles.confirmLabel} title={`Delete ${typeRecord.name}?`}>Delete {typeRecord.name}?</span>
                                        <button
                                          className={styles.confirmYes}
                                          onClick={() => handleDelete(typeRecord._id, typeRecord.name)}
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
          defaultOpen={true}
          actions={
            !moodAdding && !moodEditingId && (
              <>
                <button className={styles.addBtn} onClick={() => setMoodAdding(true)} aria-label="Add mood" title="Add mood">
                  <Plus size={14} aria-hidden="true" /> <span className={styles.addBtnLabel}>Add mood</span>
                </button>
                {moodTags.length === 0 && (
                  <button
                    className={styles.addBtn}
                    onClick={handleSeedMoodTags}
                    disabled={seeding}
                    aria-label="Seed defaults"
                    title="Seed defaults"
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
            <div className={styles.compactGrid}>
              {moodTags.map((tagRecord, index) => (
                moodEditingId === tagRecord._id && token ? (
                  <div key={tagRecord._id} className={styles.compactFormWrap}>
                    <MoodTagForm
                      key={tagRecord._id}
                      initial={moodFormFromRecord(tagRecord)}
                      token={token}
                      tagId={tagRecord._id}
                      onDone={handleMoodFormDone}
                      onCancel={() => setMoodEditingId(null)}
                    />
                  </div>
                ) : (
                  <div key={tagRecord._id} className={styles.compactChip}>
                    <span className={styles.compactIndex}>#{index + 1}</span>
                    <span className={styles.moodIcon} style={getMoodTagStyle(tagRecord)}>
                      {renderTypeIcon(tagRecord.icon, 15)}
                    </span>
                    <span className={styles.moodName}>{tagRecord.name}</span>
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
                          <span className={styles.confirmLabel} title={`Delete ${tagRecord.name}?`}>Delete {tagRecord.name}?</span>
                          <button
                            className={styles.confirmYes}
                            onClick={() => handleMoodDelete(tagRecord._id, tagRecord.name)}
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
                )
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
          defaultOpen={true}
          actions={
            !foodStyleAdding && !foodStyleEditingId && (
              <button className={styles.addBtn} onClick={() => setFoodStyleAdding(true)} aria-label="Add food style" title="Add food style">
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
            <div className={styles.compactGrid}>
              {foodStyleRecords.map((record, index) => (
                foodStyleEditingId === record._id && token ? (
                  <div key={record._id} className={styles.compactFormWrap}>
                    <FoodStyleForm
                      key={record._id}
                      initial={foodStyleFormFromRecord(record)}
                      token={token}
                      styleId={record._id}
                      onDone={handleFoodStyleFormDone}
                      onCancel={() => setFoodStyleEditingId(null)}
                    />
                  </div>
                ) : (
                  <div key={record._id} className={styles.compactChip}>
                    <span className={styles.compactIndex}>#{index + 1}</span>
                    <span className={styles.typeName}>{record.name}</span>
                    <div className={styles.typeActions}>
                      <button
                        className={styles.iconBtn}
                        onClick={() => { setFoodStyleEditingId(record._id); setFoodStyleAdding(false); }}
                        aria-label={`Edit ${record.name}`}
                      >
                        <Pencil size={13} />
                      </button>
                      {foodStyleForce?.id === record._id ? (
                        <div className={styles.confirmDelete} role="group" aria-label={foodStyleForce.message}>
                          <span className={styles.confirmLabel} title={foodStyleForce.message}>{foodStyleForce.message}</span>
                          <button
                            className={styles.confirmYes}
                            onClick={() => handleFoodStyleDelete(record._id, record.name, true)}
                            disabled={foodStyleDeleting}
                          >
                            Yes
                          </button>
                          <button className={styles.confirmNo} onClick={() => setFoodStyleForce(null)}>
                            No
                          </button>
                        </div>
                      ) : foodStyleDeleteId === record._id ? (
                        <div className={styles.confirmDelete}>
                          <span className={styles.confirmLabel} title={`Delete ${record.name}?`}>Delete {record.name}?</span>
                          <button
                            className={styles.confirmYes}
                            onClick={() => handleFoodStyleDelete(record._id, record.name)}
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
                )
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Brands card ────────────────────────────────────────────────────── */}
        <SectionCard
          icon={Store}
          title="Brands"
          headingCount={brandRecords.length}
          collapsible
          defaultOpen={true}
          actions={
            <button className={styles.addBtn} onClick={() => setAddingBrand(true)} aria-label="Add brand" title="Add brand">
              <Plus size={14} aria-hidden="true" /> <span className={styles.addBtnLabel}>Add brand</span>
            </button>
          }
        >
          {staleBrandCopies > 0 && !confirmingCleanup && (
            <div className={styles.staleNotice} role="status">
              <span>
                {staleBrandCopies} brand-linked attraction{staleBrandCopies === 1 ? " still has" : "s still have"} their own
                types or styles instead of following the brand.
              </span>
              <button type="button" className={styles.staleNoticeBtn} onClick={() => setConfirmingCleanup(true)} disabled={clearingStaleCopies}>
                {clearingStaleCopies ? "Cleaning up…" : "Clean up"}
              </button>
            </div>
          )}

          {staleBrandCopies > 0 && confirmingCleanup && (
            <div className={styles.inlineConfirm} role="group" aria-label="Confirm clean up">
              <span>
                Clear {staleBrandCopies} stale {staleBrandCopies === 1 ? "copy" : "copies"}? These attractions will follow their brand again.
              </span>
              <div className={styles.inlineConfirmActions}>
                <button type="button" className={styles.confirmYes} onClick={handleClearStaleCopies} disabled={clearingStaleCopies}>
                  Yes
                </button>
                <button type="button" className={styles.confirmNo} onClick={() => setConfirmingCleanup(false)}>
                  No
                </button>
              </div>
            </div>
          )}

          {brandsLoading ? (
            <div className={styles.center}><Loader2 size={24} className={styles.spin} /></div>
          ) : (
            <div className={styles.compactGrid}>
              {brandRecords.map((record, index) => (
                <div key={record._id} className={styles.compactChip}>
                  <span className={styles.compactIndex}>#{index + 1}</span>
                  <Store size={14} aria-hidden="true" />
                  <button
                    type="button"
                    className={styles.typeName}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", color: "inherit", textAlign: "left" }}
                    onClick={() => setViewingBrandId(record._id)}
                  >
                    {record.name}
                  </button>
                  <div className={styles.typeActions}>
                    <button
                      className={styles.iconBtn}
                      onClick={() => setViewingBrandId(record._id)}
                      aria-label={`Edit ${record.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    {brandDeleteId === record._id ? (
                      <div className={styles.confirmDelete}>
                        <span className={styles.confirmLabel} title={`Delete ${record.name}?`}>Delete {record.name}?</span>
                        <button
                          className={styles.confirmYes}
                          onClick={() => handleBrandDelete(record._id, record.name)}
                          disabled={brandDeleting}
                        >
                          Yes
                        </button>
                        <button className={styles.confirmNo} onClick={() => setBrandDeleteId(null)}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        className={`${styles.iconBtn} ${styles.deleteBtn}`}
                        onClick={() => setBrandDeleteId(record._id)}
                        aria-label={`Delete ${record.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Shop Styles card ───────────────────────────────────────────────── */}
        <SectionCard
          icon={ShoppingBag}
          title="Shop Styles"
          headingCount={shopStyleRecords.length}
          collapsible
          defaultOpen={true}
          actions={
            !shopStyleAdding && !shopStyleEditingId && (
              <button className={styles.addBtn} onClick={() => setShopStyleAdding(true)} aria-label="Add shop style" title="Add shop style">
                <Plus size={14} aria-hidden="true" /> <span className={styles.addBtnLabel}>Add shop style</span>
              </button>
            )
          }
        >
          {shopStyleAdding && token && (
            <ShopStyleForm
              key="new-shop-style"
              initial={EMPTY_SHOP_STYLE_FORM}
              token={token}
              onDone={handleShopStyleFormDone}
              onCancel={() => setShopStyleAdding(false)}
            />
          )}

          {shopStylesLoading ? (
            <div className={styles.center}><Loader2 size={24} className={styles.spin} /></div>
          ) : (
            <div className={styles.compactGrid}>
              {shopStyleRecords.map((record, index) => (
                shopStyleEditingId === record._id && token ? (
                  <div key={record._id} className={styles.compactFormWrap}>
                    <ShopStyleForm
                      key={record._id}
                      initial={shopStyleFormFromRecord(record)}
                      token={token}
                      styleId={record._id}
                      onDone={handleShopStyleFormDone}
                      onCancel={() => setShopStyleEditingId(null)}
                    />
                  </div>
                ) : (
                  <div key={record._id} className={styles.compactChip}>
                    <span className={styles.compactIndex}>#{index + 1}</span>
                    {renderTypeIcon(record.icon)}
                    <span className={styles.typeName}>{record.name}</span>
                    <div className={styles.typeActions}>
                      <button
                        className={styles.iconBtn}
                        onClick={() => { setShopStyleEditingId(record._id); setShopStyleAdding(false); }}
                        aria-label={`Edit ${record.name}`}
                      >
                        <Pencil size={13} />
                      </button>
                      {shopStyleDeleteId === record._id ? (
                        <div className={styles.confirmDelete}>
                          <span className={styles.confirmLabel} title={`Delete ${record.name}?`}>Delete {record.name}?</span>
                          <button
                            className={styles.confirmYes}
                            onClick={() => handleShopStyleDelete(record._id, record.name)}
                            disabled={shopStyleDeleting}
                          >
                            Yes
                          </button>
                          <button className={styles.confirmNo} onClick={() => setShopStyleDeleteId(null)}>
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          className={`${styles.iconBtn} ${styles.deleteBtn}`}
                          onClick={() => setShopStyleDeleteId(record._id)}
                          aria-label={`Delete ${record.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </SectionCard>
      </div>
      {viewingBrandId && (
        <BrandModal isOpen={!!viewingBrandId} onClose={() => setViewingBrandId(null)} brandId={viewingBrandId} />
      )}
      {addingBrand && (
        <BrandModal isOpen={addingBrand} onClose={() => setAddingBrand(false)} createMode />
      )}
    </main>
  );
}
