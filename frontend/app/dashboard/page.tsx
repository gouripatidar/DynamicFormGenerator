"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getToken } from "../../lib/api";

type Form = {
  _id: string;
  title: string;
  description?: string;
  createdAt: string;
};

type Submission = {
  _id: string;
  formId: string;
  responses: Record<string, any>;
  submittedAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const formsRes = await api.get("/forms");
      setForms(formsRes.data || []);

      // Fetch submissions for each form
      const submissionsMap: Record<string, Submission[]> = {};
      for (const form of formsRes.data || []) {
        const subsRes = await api.get(`/forms/${form._id}/submissions`);
        submissionsMap[form._id] = subsRes.data || [];
      }
      setSubmissions(submissionsMap);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    try {
      setGenerating(true);
      const res = await api.post("/forms/generate", { prompt });
      // Refresh forms list
      await fetchData();
      setPrompt("");
      // Optionally navigate to the new form
      if (res.data?.form?._id) {
        router.push(`/form/${res.data.form._id}`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to generate form");
    } finally {
      setGenerating(false);
    }
  };

  const copyFormLink = (formId: string) => {
    const link = `${window.location.origin}/form/${formId}`;
    navigator.clipboard.writeText(link);
    alert("Form link copied to clipboard!");
  };

  if (loading) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Dashboard</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Dashboard</h1>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            router.push("/login");
          }}
          style={{
            padding: "0.5rem 1rem",
            background: "#666",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </div>

      {error && <p style={{ color: "red", marginBottom: "1rem" }}>{error}</p>}

      {/* Form Generator */}
      <section style={{ marginBottom: "2rem", padding: "1rem", background: "#f5f5f5", borderRadius: 4 }}>
        <h2>Generate New Form with AI</h2>
        <form onSubmit={handleGenerateForm} style={{ display: "grid", gap: "1rem" }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the form you want to create (e.g., 'I need a job application form with name, email, resume upload, and portfolio link')"
            style={{
              width: "100%",
              minHeight: "80px",
              padding: "0.5rem",
              fontFamily: "monospace"
            }}
            required
          />
          <button
            type="submit"
            disabled={generating}
            style={{
              padding: "0.75rem 1.5rem",
              background: "black",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: generating ? "not-allowed" : "pointer",
              opacity: generating ? 0.6 : 1
            }}
          >
            {generating ? "Generating..." : "Generate Form"}
          </button>
        </form>
      </section>

      {/* Forms List */}
      <section>
        <h2>Your Forms ({forms.length})</h2>
        {forms.length === 0 ? (
          <p>No forms created yet. Generate your first form above!</p>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {forms.map((form) => (
              <div
                key={form._id}
                style={{
                  padding: "1rem",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  background: "white"
                }}
              >
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <h3>{form.title}</h3>
                  {form.description && <p style={{ margin: 0, color: "#666" }}>{form.description}</p>}
                  <small style={{ color: "#999" }}>
                    Created: {new Date(form.createdAt).toLocaleDateString()}
                  </small>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                    <Link
                      href={`/form/${form._id}`}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "blue",
                        color: "white",
                        textDecoration: "none",
                        borderRadius: 4
                      }}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => copyFormLink(form._id)}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "green",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer"
                      }}
                    >
                      Copy Public Link
                    </button>
                  </div>

                  {/* Submissions for this form */}
                  {submissions[form._id] && submissions[form._id].length > 0 && (
                    <details style={{ marginTop: "1rem" }}>
                      <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                        Submissions ({submissions[form._id].length})
                      </summary>
                      <div style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}>
                        {submissions[form._id].map((submission, idx) => (
                          <div key={submission._id} style={{ padding: "0.5rem", background: "#f9f9f9", marginBottom: "0.5rem", borderRadius: 3 }}>
                            <small>Submission {idx + 1} - {new Date(submission.submittedAt).toLocaleString()}</small>
                            <pre style={{ marginTop: "0.25rem", fontSize: "0.8rem", overflow: "auto" }}>
                              {JSON.stringify(submission.responses, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
