"use client";

import { useState } from "react";
import { api, setToken } from "../../lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/auth/login", { email, password });
      setToken(res.data.token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>Login</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            style={{ width: "100%", padding: "0.5rem" }}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            style={{ width: "100%", padding: "0.5rem" }}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            background: "black",
            color: "white",
            borderRadius: 4,
            border: "none"
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p style={{ marginTop: "0.75rem" }}>
        No account? <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}
