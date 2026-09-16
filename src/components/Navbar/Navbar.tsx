"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane, MapPinned, Menu, X, Compass, Map, LogIn, LogOut, BarChart2, User, Shield, Download } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import styles from "./Navbar.module.css";

export function Navbar() {
  const { user, token, logout } = useAuth();
  const { error: showError } = useToast();
  const pathname = usePathname();
  const isAdminPage = pathname === "/admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupNeeded, setBackupNeeded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const LAST_BACKUP_KEY = "tp_last_backup_at";

  // Admin only — lets the backup button visibly flag when attractions have changed
  // since the last backup, so the admin knows a fresh one is needed rather than
  // having to guess or re-download speculatively.
  useEffect(() => {
    if (!token || user?.role !== "admin") return;
    let cancelled = false;
    fetch("/api/admin/backup/status", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { latestAttractionChangeAt: string | null } | null) => {
        if (cancelled || !data) return;
        const lastBackupAt = localStorage.getItem(LAST_BACKUP_KEY);
        const latestChange = data.latestAttractionChangeAt;
        setBackupNeeded(!!latestChange && (!lastBackupAt || new Date(latestChange) > new Date(lastBackupAt)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [token, user?.role]);

  // Close dropdown on click-outside and Escape
  useEffect(() => {
    if (!dropdownOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  function handleLogout() {
    logout();
    setDropdownOpen(false);
    setMenuOpen(false);
  }

  async function handleDownloadBackup() {
    if (!token || backupLoading) return;
    setBackupLoading(true);
    try {
      const res = await fetch("/api/admin/backup", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Backup request failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tripplanner-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
      setBackupNeeded(false);
    } catch {
      showError("Failed to download backup. Please try again.");
    } finally {
      setBackupLoading(false);
      setDropdownOpen(false);
      setMenuOpen(false);
    }
  }

  const userInitial = user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <header>
      <nav className={styles.navbar} aria-label="Main navigation">
        <div className={styles.inner}>
          <Link href="/" className={styles.brand} aria-label="TripPlanner home">
            <Plane size={22} className={styles.brandIcon} aria-hidden="true" />
            <span className={styles.brandName}>TripPlanner</span>
          </Link>

          <ul className={styles.nav} role="list">
            <li>
              <Link
                href="/explore"
                className={`${styles.navLink} ${pathname === "/explore" ? styles.navLinkActive : ""}`}
              >
                <Compass size={16} aria-hidden="true" />
                Explore
              </Link>
            </li>
            <li>
              <Link
                href="/trips"
                className={`${styles.navLink} ${pathname.startsWith("/trips") ? styles.navLinkActive : ""}`}
              >
                <Map size={16} aria-hidden="true" />
                My Trips
              </Link>
            </li>
            <li>
              <Link
                href="/analytics"
                className={`${styles.navLink} ${pathname.startsWith("/analytics") ? styles.navLinkActive : ""}`}
              >
                <BarChart2 size={16} aria-hidden="true" />
                Analytics
              </Link>
            </li>
          </ul>

          <div className={styles.actions}>
            <ThemeToggle />

            {user ? (
              <>
                {!isAdminPage && (
                  <Link href="/new-trip" className={styles.newTripBtn} aria-label="Plan a new trip">
                    <MapPinned size={16} aria-hidden="true" />
                    New Trip
                  </Link>
                )}

                {/* Avatar + dropdown */}
                <div className={styles.avatarWrapper} ref={dropdownRef}>
                  <button
                    className={styles.avatar}
                    aria-label={`Account menu for ${user.name}${backupNeeded ? " (backup needed)" : ""}`}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                    onClick={() => setDropdownOpen((v) => !v)}
                  >
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt=""
                        width={36}
                        height={36}
                        className={styles.avatarImg}
                      />
                    ) : (
                      userInitial
                    )}
                    {backupNeeded && (
                      <span
                        className={styles.avatarBackupDot}
                        aria-hidden="true"
                        title="Attractions have changed since the last backup"
                      />
                    )}
                  </button>

                  {dropdownOpen && (
                    <div className={styles.dropdown} role="menu">
                      <div className={styles.dropdownHeader}>
                        <span className={styles.dropdownName}>{user.name}</span>
                        <span className={styles.dropdownEmail}>{user.email}</span>
                      </div>
                      <Link
                        href="/profile"
                        className={styles.dropdownLink}
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <User size={15} aria-hidden="true" />
                        My Profile
                      </Link>
                      {user.role === "admin" && (
                        <Link
                          href="/admin"
                          className={styles.dropdownLink}
                          role="menuitem"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <Shield size={15} aria-hidden="true" />
                          Manager Panel
                        </Link>
                      )}
                      {user.role === "admin" && (
                        <button
                          className={styles.dropdownLink}
                          role="menuitem"
                          onClick={handleDownloadBackup}
                          disabled={backupLoading}
                          title={backupNeeded ? "Attractions have changed since the last backup" : undefined}
                        >
                          <span className={styles.backupIconWrap}>
                            <Download size={15} aria-hidden="true" />
                            {backupNeeded && <span className={styles.backupDot} aria-hidden="true" />}
                          </span>
                          {backupLoading
                            ? "Preparing backup…"
                            : backupNeeded
                              ? "Download Backup (new changes)"
                              : "Download Backup"}
                        </button>
                      )}
                      <div className={styles.dropdownDivider} aria-hidden="true" />
                      <button
                        className={styles.logoutBtn}
                        role="menuitem"
                        onClick={handleLogout}
                      >
                        <LogOut size={15} aria-hidden="true" />
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link href="/login" className={styles.loginBtn} aria-label="Sign in">
                <LogIn size={15} aria-hidden="true" />
                Log in
              </Link>
            )}

            <button
              className={styles.menuButton}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {menuOpen ? (
                <X size={22} aria-hidden="true" />
              ) : (
                <Menu size={22} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className={`${styles.mobileMenu} ${styles.mobileMenuOpen}`} role="menu">
          <Link
            href="/explore"
            className={styles.mobileNavLink}
            onClick={() => setMenuOpen(false)}
          >
            <Compass size={18} aria-hidden="true" />
            Explore
          </Link>
          <Link
            href="/trips"
            className={`${styles.mobileNavLink} ${pathname.startsWith("/trips") ? styles.mobileNavLinkActive : ""}`}
            onClick={() => setMenuOpen(false)}
          >
            <Map size={18} aria-hidden="true" />
            My Trips
          </Link>
          <Link
            href="/analytics"
            className={styles.mobileNavLink}
            onClick={() => setMenuOpen(false)}
          >
            <BarChart2 size={18} aria-hidden="true" />
            Analytics
          </Link>

          {user ? (
            <>
              {!isAdminPage && (
                <Link
                  href="/new-trip"
                  className={styles.mobileNewTripBtn}
                  aria-label="Plan a new trip"
                  onClick={() => setMenuOpen(false)}
                >
                  <MapPinned size={16} aria-hidden="true" />
                  New Trip
                </Link>
              )}
              <Link
                href="/profile"
                className={styles.mobileNavLink}
                onClick={() => setMenuOpen(false)}
              >
                <User size={18} aria-hidden="true" />
                My Profile
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className={styles.mobileNavLink}
                  onClick={() => setMenuOpen(false)}
                >
                  <Shield size={18} aria-hidden="true" />
                  Manager Panel
                </Link>
              )}
              {user.role === "admin" && (
                <button
                  className={styles.mobileNavLink}
                  onClick={handleDownloadBackup}
                  disabled={backupLoading}
                >
                  <span className={styles.backupIconWrap}>
                    <Download size={18} aria-hidden="true" />
                    {backupNeeded && <span className={styles.backupDot} aria-hidden="true" />}
                  </span>
                  {backupLoading
                    ? "Preparing backup…"
                    : backupNeeded
                      ? "Download Backup (new changes)"
                      : "Download Backup"}
                </button>
              )}
              <button
                className={styles.mobileLogoutBtn}
                onClick={handleLogout}
              >
                <LogOut size={18} aria-hidden="true" />
                Log out ({user.name})
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className={styles.mobileNewTripBtn}
              onClick={() => setMenuOpen(false)}
            >
              <LogIn size={16} aria-hidden="true" />
              Log in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
