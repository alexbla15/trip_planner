"use client";

import { useState } from "react";
import Link from "next/link";
import { Plane, Plus, Menu, X, Compass, Map, MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle/ThemeToggle";
import { NewAttractionModal } from "@/components/NewAttractionModal/NewAttractionModal";
import type { AttractionFormData } from "@/components/NewAttractionModal/attraction.types";
import { useGlobalAttractions } from "@/contexts/AttractionsContext";
import styles from "./Navbar.module.css";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [attractionModalOpen, setAttractionModalOpen] = useState(false);
  const { addGlobalAttraction } = useGlobalAttractions();

  function toggleMenu() {
    setMenuOpen((prev) => !prev);
  }

  function handleAttractionSave(data: AttractionFormData) {
    addGlobalAttraction(data);
  }

  return (
    <>
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
                  <Compass size={16} aria-hidden="true" />
                  Explore
                </a>
              </li>
              <li>
                <a href="#my-trips" className={styles.navLink}>
                  <Map size={16} aria-hidden="true" />
                  My Trips
                </a>
              </li>
            </ul>

            <div className={styles.actions}>
              <ThemeToggle />
              <button
                className={styles.addAttractionBtn}
                aria-label="Add a new attraction"
                onClick={() => setAttractionModalOpen(true)}
              >
                <MapPin size={15} aria-hidden="true" />
                Add Attraction
              </button>
              <Link href="/new-trip" className={styles.newTripBtn} aria-label="Plan a new trip">
                <Plus size={16} aria-hidden="true" />
                New Trip
              </Link>
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
              <Compass size={18} aria-hidden="true" />
              Explore
            </a>
            <a
              href="#my-trips"
              className={styles.mobileNavLink}
              onClick={() => setMenuOpen(false)}
            >
              <Map size={18} aria-hidden="true" />
              My Trips
            </a>
            <button
              className={styles.mobileNavLink}
              onClick={() => {
                setMenuOpen(false);
                setAttractionModalOpen(true);
              }}
              aria-label="Add a new attraction"
            >
              <MapPin size={18} aria-hidden="true" />
              Add Attraction
            </button>
            <Link href="/new-trip" className={styles.mobileNewTripBtn} aria-label="Plan a new trip" onClick={() => setMenuOpen(false)}>
              <Plus size={16} aria-hidden="true" />
              New Trip
            </Link>
          </div>
        )}
      </header>

      <NewAttractionModal
        isOpen={attractionModalOpen}
        onClose={() => setAttractionModalOpen(false)}
        onSave={handleAttractionSave}
      />
    </>
  );
}
