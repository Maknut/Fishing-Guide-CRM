"use client";
import { useEffect } from "react";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="fullpage">
      <div className="inner">
        <h1>This page didn't load</h1>
        <p>Something went wrong on our end. Try again in a moment.</p>
        <button type="button" className="btn btn--primary" onClick={reset}><span>Try again</span></button>
      </div>
    </main>
  );
}
