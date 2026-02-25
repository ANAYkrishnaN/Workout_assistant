"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
export default function Error(error, reset) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html>
      <body>
        <h2>Something went wrong</h2>
      </body>
    </html>
  );
}