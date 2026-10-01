export function FormError({ error, details }: { error?: string | null; details?: string[] }) {
  if (!error) return null;
  return (
    <div role="alert" className="rounded-md border border-destructive/40 bg-card p-3 text-sm text-negative">
      <p className="font-semibold">{error}</p>
      {details && details.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export async function readError(res: Response): Promise<{ error: string; details?: string[] }> {
  try {
    const body = await res.json();
    return { error: body.error ?? "Something went wrong.", details: body.details };
  } catch {
    return { error: "Something went wrong." };
  }
}
