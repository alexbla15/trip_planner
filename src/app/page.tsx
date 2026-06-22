import { Plus, Compass, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar/Navbar";
import { TripCard } from "@/components/TripCard/TripCard";
import { NewTripCard } from "@/components/NewTripCard/NewTripCard";
import { ExploreSection } from "@/components/ExploreSection/ExploreSection";
import { mockTrips } from "@/data/mockTrips";
import { mockExplore } from "@/data/mockExplore";
import styles from "./page.module.css";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const greeting = getGreeting();

  return (
    <div className={styles.page}>
      <a href="#main-content" className="srOnly">
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content" className={styles.main}>
        {/* Hero */}
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroInner}>
            <h1 id="hero-heading" className={styles.heroGreeting}>
              {greeting}, Alex! ✈️
            </h1>
            <p className={styles.heroSubline}>
              Where will your next adventure take you?
            </p>
            <div className={styles.heroCtas}>
              <a
                href="#my-trips"
                className={styles.btnPrimary}
                aria-label="Plan a new trip"
              >
                <Plus size={18} aria-hidden="true" />
                Plan a New Trip
              </a>
              <a
                href="#explore"
                className={styles.btnGhost}
                aria-label="Explore destinations"
              >
                <Compass size={18} aria-hidden="true" />
                Explore Destinations
              </a>
            </div>
          </div>
        </section>

        {/* My Trips */}
        <section
          className={styles.myTrips}
          id="my-trips"
          aria-labelledby="my-trips-heading"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeader}>
              <h2 id="my-trips-heading" className={styles.sectionTitle}>
                My Trips
              </h2>
              <span className={styles.sectionCount} aria-label={`${mockTrips.length} trips`}>
                ({mockTrips.length})
              </span>
              <a href="#" className={styles.sectionSeeAll} aria-label="See all trips">
                See all <ArrowRight size={14} aria-hidden="true" />
              </a>
            </div>

            <div className={styles.tripsGrid}>
              <NewTripCard />
              {mockTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </div>
        </section>

        {/* Explore */}
        <ExploreSection items={mockExplore} />
      </main>

      <footer className={styles.footer}>
        <p>© 2025 TripPlanner · Made with ☁️ for wanderers</p>
      </footer>
    </div>
  );
}
