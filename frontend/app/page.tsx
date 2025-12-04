"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>AI-Powered Dynamic Form Generator</h1>
      <p style={{ marginTop: "0.5rem" }}>
        Please <Link href="/login">log in</Link> or{" "}
        <Link href="/signup">sign up</Link> to continue.
      </p>
    </main>
  );
}
