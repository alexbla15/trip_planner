"use client";

import { useState, useMemo } from "react";
import { getIconComponent } from "@/components/IconPicker";
import { useAttractionTypes } from "@/hooks/useAttractionTypes";
import { donutSlicePath, tintColor } from "@/lib/geometry";
import styles from "./CategoryDonutChart.module.css";

const CX = 110; const CY = 110;
const OUTER_R = 100; const INNER_R = 60;

// ── Props ────────────────────────────────────────────────────────────────────

interface CategoryDonutChartProps {
  rawTypes: Array<{ _id: string; count: number }>;
  loading?: boolean;
  emptyText?: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CategoryDonutChart({
  rawTypes,
  loading = false,
  emptyText = "No category data yet.",
}: CategoryDonutChartProps) {
  const { byCategory, colorForCategory } = useAttractionTypes();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryAggregated = useMemo(() => {
    const map: Record<string, number> = {};
    for (const { _id, count } of rawTypes) {
      for (const [cat, catTypes] of Object.entries(byCategory)) {
        if (catTypes.some((t) => t.name === _id)) {
          map[cat] = (map[cat] ?? 0) + count;
          break;
        }
      }
    }
    return Object.entries(map)
      .map(([cat, count]) => ({ _id: cat, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawTypes, byCategory]);

  const categoryTotal = useMemo(
    () => categoryAggregated.reduce((s, c) => s + c.count, 0),
    [categoryAggregated],
  );

  const slices = useMemo(() => {
    let cum = 0;
    return categoryAggregated.map((cat, i) => {
      const pct = categoryTotal > 0 ? cat.count / categoryTotal : 0;
      const startAngle = cum;
      const endAngle = cum + pct * 360;
      cum = endAngle;
      const color =
        colorForCategory(cat._id) !== "#64748B"
          ? colorForCategory(cat._id)
          : `hsl(${(i * 47) % 360}, 70%, 80%)`;
      return { cat, i, startAngle, endAngle, color };
    });
  }, [categoryAggregated, categoryTotal, colorForCategory]);

  const subChartTypes = useMemo(() => {
    if (!selectedCategory) return [];
    const catTypeNames = (byCategory[selectedCategory] ?? []).map((t) => t.name);
    return rawTypes
      .filter(({ _id, count }) => catTypeNames.includes(_id) && count > 0)
      .sort((a, b) => b.count - a.count);
  }, [selectedCategory, rawTypes, byCategory]);

  const subChartTotal = useMemo(
    () => subChartTypes.reduce((s, t) => s + t.count, 0),
    [subChartTypes],
  );

  const subSlices = useMemo(() => {
    if (!selectedCategory || subChartTypes.length === 0) return [];
    const baseColor = colorForCategory(selectedCategory);
    let cum = 0;
    return subChartTypes.map(({ _id, count }, i) => {
      const pct = subChartTotal > 0 ? count / subChartTotal : 0;
      const startAngle = cum;
      const endAngle = cum + pct * 360;
      cum = endAngle;
      const opacity = 1.0 - (i / Math.max(subChartTypes.length - 1, 1)) * 0.65;
      return { _id, count, i, startAngle, endAngle, color: tintColor(baseColor, opacity) };
    });
  }, [selectedCategory, subChartTypes, subChartTotal, colorForCategory]);

  function handleSliceClick(catName: string) {
    setSelectedCategory((prev) => (prev === catName ? null : catName));
  }

  if (loading) {
    return (
      <div className={styles.pieSkeleton} aria-hidden="true">
        <div className={`${styles.skeletonPieCircle} ${styles.shimmer}`} />
        <div className={styles.skeletonLegend}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonLegendRow}>
              <div className={`${styles.skeletonDot} ${styles.shimmer}`} />
              <div className={`${styles.skeletonLegendText} ${styles.shimmer}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (categoryAggregated.length === 0) {
    return <p className={styles.sectionEmpty}>{emptyText}</p>;
  }

  return (
    <div className={styles.pieSection}>
      {/* Main chart */}
      <div className={styles.mainChart}>
        <svg
          viewBox="0 0 220 220"
          width="220"
          height="220"
          className={styles.pieSvg}
          aria-label="Attraction categories donut chart"
          role="img"
        >
          {slices.map(({ cat, i, startAngle, endAngle, color }) => (
            <path
              key={cat._id}
              d={donutSlicePath(CX, CY, OUTER_R, INNER_R, startAngle, endAngle)}
              fill={color}
              stroke="white"
              strokeWidth="2"
              className={[
                hoveredIndex === i ? styles.sliceHovered : styles.slice,
                selectedCategory === cat._id ? styles.sliceSelected : "",
              ].filter(Boolean).join(" ")}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleSliceClick(cat._id)}
              aria-label={`${cat._id}: ${cat.count}${selectedCategory === cat._id ? " (selected)" : ""}`}
            />
          ))}
        </svg>

        <ul className={styles.pieLegend} aria-label="Category breakdown">
          {slices.map(({ cat, i, color }) => {
            const pct =
              categoryTotal > 0
                ? ((cat.count / categoryTotal) * 100).toFixed(1)
                : "0";
            const catIconName = byCategory[cat._id]?.[0]?.categoryIcon ?? "Globe";
            const CatIcon = getIconComponent(catIconName);
            const isHovered = hoveredIndex === i;
            const isSelected = selectedCategory === cat._id;
            return (
              <li
                key={cat._id}
                className={[
                  styles.legendItem,
                  isHovered ? styles.legendItemHovered : "",
                  isSelected ? styles.legendItemSelected : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                tabIndex={0}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => handleSliceClick(cat._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSliceClick(cat._id);
                  }
                }}
              >
                <span
                  className={styles.legendDot}
                  style={{ ["--dot-color" as string]: color }}
                />
                {CatIcon && (
                  <span className={styles.legendIcon} aria-hidden="true">
                    <CatIcon size={12} />
                  </span>
                )}
                <span className={styles.legendName}>{cat._id}</span>
                <span className={styles.legendCount}>{cat.count.toLocaleString()}</span>
                <span className={styles.legendPct}>{pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sub-chart drill-down */}
      {selectedCategory && subSlices.length > 0 && (
        <div
          className={styles.subChart}
          aria-live="polite"
          aria-label={`${selectedCategory} breakdown`}
        >
          <p className={styles.subChartTitle}>{selectedCategory}</p>
          <div className={styles.subChartBody}>
            <svg
              viewBox="0 0 220 220"
              width="220"
              height="220"
              className={styles.pieSvg}
              aria-label={`${selectedCategory} type breakdown`}
              role="img"
            >
              {subSlices.map(({ _id, count, startAngle, endAngle, color }) => (
                <path
                  key={_id}
                  d={donutSlicePath(CX, CY, OUTER_R, INNER_R, startAngle, endAngle)}
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  className={styles.slice}
                  aria-label={`${_id}: ${count}`}
                />
              ))}
            </svg>
            <ul className={styles.subLegend} aria-label={`${selectedCategory} types`}>
              {subSlices.map(({ _id, count, color }) => {
                const pct =
                  subChartTotal > 0
                    ? ((count / subChartTotal) * 100).toFixed(1)
                    : "0";
                return (
                  <li key={_id} className={styles.subLegendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ ["--dot-color" as string]: color }}
                    />
                    <span className={styles.legendName}>{_id}</span>
                    <span className={styles.legendCount}>{count.toLocaleString()}</span>
                    <span className={styles.legendPct}>{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
