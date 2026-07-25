export interface RouteErrorProps {
  /** The error Next.js caught for this route segment (`digest` links it to the server log entry). */
  error: Error & { digest?: string };
  /** Re-renders the segment, given to `error.tsx` by Next.js. */
  reset: () => void;
  /** Heading shown above the message. Defaults to a generic "Something went wrong". */
  title?: string;
}
