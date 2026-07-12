"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plane, MapPinned, Menu, X, Compass, Map, LogIn, LogOut, BarChart2, User, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./Navbar.module.css";

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const isAdminPage = pathname === "/admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
                    aria-label={`Account menu for ${user.name}`}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                    onClick={() => setDropdownOpen((v) => !v)}
                  >
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className={styles.avatarImg}
                      />
                    ) : (
                      userInitial
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
