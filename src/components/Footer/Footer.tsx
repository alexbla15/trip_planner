import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p>© 2025 TripPlanner · Created by Alex Blahman &amp; Claude</p>
      </div>
    </footer>
  );
}
