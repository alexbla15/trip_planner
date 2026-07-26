"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import styles from "./ApiDocsClient.module.css";

// swagger-ui-react touches `window` at module scope, so it can never be part of the SSR
// render — ssr:false keeps it out of the server bundle entirely.
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsClient() {
  return (
    <div className={styles.wrapper}>
      <SwaggerUI url="/api/openapi" />
    </div>
  );
}
