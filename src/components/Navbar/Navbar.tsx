"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plane, MapPinned, Menu, X, Compass, Map, LogIn, LogOut, BarChart2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./Navbar.module.css";

export function Navbar() {
  const { user, logout } = useAuth();
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
              <a href="/#explore" className={styles.navLink}>
                <Compass size={16} aria-hidden="true" />
                Explore
              </a>
            </li>
            <li>
              <a href="/#my-trips" className={styles.navLink}>
                <Map size={16} aria-hidden="true" />
                My Trips
              </a>
            </li>
            <li>
              <Link href="/analytics" className={styles.navLink}>
                <BarChart2 size={16} aria-hidden="true" />
                Analytics
              </Link>
            </li>
          </ul>

          <div className={styles.actions}>
            <ThemeToggle />

            {user ? (
              <>
                <Link href="/new-trip" className={styles.newTripBtn} aria-label="Plan a new trip">
                  <MapPinned size={16} aria-hidden="true" />
                  New Trip
                </Link>

                {/* Avatar + dropdown */}
                <div className={styles.avatarWrapper} ref={dropdownRef}>
                  <button
                    className={styles.avatar}
                    aria-label={`Account menu for ${user.name}`}
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                    onClick={() => setDropdownOpen((v) => !v)}
                  >
                    {userInitial}
                  </button>

                  {dropdownOpen && (
                    <div className={styles.dropdown} role="menu">
                      <div className={styles.dropdownHeader}>
                        <span className={styles.dropdownName}>{user.name}</span>
                        <span className={styles.dropdownEmail}>{user.email}</span>
                      </div>
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
          <a
            href="/#explore"
            className={styles.mobileNavLink}
            onClick={() => setMenuOpen(false)}
          >
            <Compass size={18} aria-hidden="true" />
            Explore
          </a>
          <a
            href="/#my-trips"
            className={styles.mobileNavLink}
            onClick={() => setMenuOpen(false)}
          >
            <Map size={18} aria-hidden="true" />
            My Trips
          </a>
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
              <Link
                href="/new-trip"
                className={styles.mobileNewTripBtn}
                aria-label="Plan a new trip"
                onClick={() => setMenuOpen(false)}
              >
                <MapPinned size={16} aria-hidden="true" />
                New Trip
              </Link>
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
