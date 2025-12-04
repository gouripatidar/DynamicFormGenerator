"use client";

import { useState } from "react";
import { api } from "../lib/api";

export type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "email" | "textarea" | "select" | "checkbox" | "radio" | "file" | "date";
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  pattern?: string;
  placeholder?: string;
};

export type FormSchema = {
  fields: Field[];
};

type Props = {
  formId: string;
  schema: FormSchema;
};

export default function DynamicForm({ formId, schema }: Props) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await api.post(`/forms/${formId}/submit`, { responses: values });
      setMessage("Submitted successfully!");
      setValues({});
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
      {schema.fields.map((field) => (
        <div key={field.name}>
          <label style={{ display: "block", fontWeight: 500 }}>
            {field.label}
            {field.required && <span style={{ color: "red", marginLeft: 4 }}>*</span>}
          </label>

          {field.type === "textarea" ? (
            <textarea
              style={{ width: "100%", padding: "0.5rem" }}
              value={values[field.name] ?? ""}
              placeholder={field.placeholder}
              required={field.required}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          ) : field.type === "select" ? (
            <select
              style={{ width: "100%", padding: "0.5rem" }}
              value={values[field.name] ?? ""}
              required={field.required}
              onChange={(e) => handleChange(field.name, e.target.value)}
            >
              <option value="">-- Select {field.label} --</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : field.type === "file" ? (
            <>
              <input
                type="url"
                placeholder="Paste uploaded image/document URL (Cloudinary)"
                style={{ width: "100%", padding: "0.5rem" }}
                value={values[field.name] ?? ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
              />
              <small>
                For now, upload your file to Cloudinary (or similar) and paste the URL here.
                You can later replace this with a direct Cloudinary widget.
              </small>
            </>
          ) : (
            <input
              style={{ width: "100%", padding: "0.5rem" }}
              type={field.type === "number" ? "number" : field.type}
              value={values[field.name] ?? ""}
              placeholder={field.placeholder}
              required={field.required}
              min={field.type === "number" ? field.min : undefined}
              max={field.type === "number" ? field.max : undefined}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "0.5rem 1rem",
          background: "black",
          color: "white",
          borderRadius: 4,
          border: "none"
        }}
      >
        {submitting ? "Submitting..." : "Submit"}
      </button>

      {message && <p>{message}</p>}
    </form>
  );
}
