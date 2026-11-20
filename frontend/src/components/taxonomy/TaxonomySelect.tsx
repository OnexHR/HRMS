type Option = { value: string; label: string };

type TaxonomySelectProps = {
  kind: "subjects" | "languages" | "hobbies";
  value?: string[];
  values?: string[];
  onChange: (values: string[]) => void;
  max?: number;
  showChips?: boolean;
  placeholder?: string;
};

export function TaxonomySelect({ kind, value, values, onChange }: TaxonomySelectProps) {
  const selected = value ?? values ?? [];
  const options: Record<TaxonomySelectProps["kind"], Option[]> = {
    subjects: [
      { value: "Mathematics", label: "Mathematics" },
      { value: "Science", label: "Science" },
    ],
    languages: [
      { value: "English", label: "English" },
      { value: "Hindi", label: "Hindi" },
    ],
    hobbies: [
      { value: "Chess", label: "Chess" },
      { value: "Music", label: "Music" },
    ],
  };

  return (
    <select
      className="w-full rounded-md border border-gray-300 px-3 py-2"
      value={selected[0] ?? ""}
      onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
    >
      <option value="">Select {kind}</option>
      {options[kind].map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
