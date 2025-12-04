import DynamicForm, { FormSchema } from "../../../components/DynamicForm";
import { API_BASE_URL } from "../../../lib/api";

type FormData = {
  id: string;
  title: string;
  description?: string;
  schema: FormSchema;
};

async function fetchForm(id: string): Promise<FormData | null> {
  const res = await fetch(`${API_BASE_URL}/api/forms/${id}`, {
    cache: "no-store"
  });

  if (!res.ok) return null;
  return res.json();
}

export default async function PublicFormPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const form = await fetchForm(id);

  if (!form) {
    return (
      <main>
        <h1>Form not found</h1>
      </main>
    );
  }

  return (
    <main>
      <h1>{form.title}</h1>
      {form.description && <p>{form.description}</p>}
      <DynamicForm formId={form.id} schema={form.schema} />
    </main>
  );
}
