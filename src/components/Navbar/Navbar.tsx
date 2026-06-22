"use client";

import { useState } from "react";
import { Plane, Plus, Menu, X } from "lucide-react";
import styles from "./Navbar.module.css";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  function toggleMenu() {
    setMenuOpen((prev) => !prev);
  }

  return (
    <header>
      <nav className={styles.navbar} aria-label="Main navigation">
        <div className={styles.inner}>
          <a href="/" className={styles.brand} aria-label="TripPlanner home">
            <Plane size={22} className={styles.brandIcon} aria-hidden="true" />
            <span className={styles.brandName}>TripPlanner</span>
          </a>

          <ul className={styles.nav} role="list">
            <li>
              <a href="#explore" className={styles.navLink}>
                Explore
              </a>
            </li>
            <li>
              <a href="#my-trips" className={styles.navLink}>
                My Trips
              </a>
            </li>
          </ul>

          <div className={styles.actions}>
            <button className={styles.newTripBtn} aria-label="Plan a new trip">
              <Plus size={16} aria-hidden="true" />
              New Trip
            </button>
            <div
              className={styles.avatar}
              role="img"
              aria-label="User profile: Alex"
            >
              A
            </div>
            <button
              className={styles.menuButton}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={toggleMenu}
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
            href="#explore"
            className={styles.mobileNavLink}
            onClick={() => setMenuOpen(false)}
          >
            Explore
          </a>
          <a
            href="#my-trips"
            className={styles.mobileNavLink}
            onClick={() => setMenuOpen(false)}
          >
            My Trips
          </a>
          <button className={styles.mobileNewTripBtn} aria-label="Plan a new trip">
            <Plus size={16} aria-hidden="true" />
            New Trip
          </button>
        </div>
      )}
    </header>
  );
}
