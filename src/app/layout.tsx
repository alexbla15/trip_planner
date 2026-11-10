import type { Metadata } from "next";
import Script from "next/script";
import { Navbar, Footer } from "@/components";
import { Providers } from "./Providers";
import "./globals.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "TripPlanner",
  description:
    "Website for easy planning and visualizing itineraries of trips around the globe",
};

const themeScript = `
  try {
    var t = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = t;
  } catch(e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
        <Script id="theme-script" strategy="afterInteractive">
          {themeScript}
        </Script>
      </head>
      <body>
        <Providers>
          <div className={styles.wrapper}>
            <a href="#main-content" className="srOnly">
              Skip to main content
            </a>
            <Navbar />
            <div className={styles.content}>
              {children}
            </div>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
