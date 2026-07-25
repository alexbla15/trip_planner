"use client";

import { RouteError } from "@/components";
import type { RouteErrorProps } from "@/components";

export default function Error({ error, reset }: RouteErrorProps) {
  return <RouteError error={error} reset={reset} title="Couldn't load Explore" />;
}
