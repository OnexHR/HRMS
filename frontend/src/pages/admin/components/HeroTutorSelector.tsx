import { useMemo, useState } from "react";
import type { Trainer } from "../../../hooks/useTrainers";

type Props = {
  trainers: Trainer[];
  loading: boolean;
  creating: boolean;
  onAdd: (id: string) => Promise<void>;
};

export default function HeroTutorSelector({
  trainers,
  loading,
  creating,
  onAdd,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedTutor, setSelectedTutor] = useState("");

  const filteredTrainers = useMemo(() => {
    return trainers.filter((trainer) =>
      trainer.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [trainers, search]);

  const handleAdd = async () => {
    if (!selectedTutor) return;

    await onAdd(selectedTutor);

    setSearch("");
    setSelectedTutor("");
  };

  return (
    <section className='rounded-xl border p-6'>
      <h2 className='mb-4 text-xl font-semibold'>Add Hero Tutor</h2>

      <input
        type='text'
        placeholder='Search tutor...'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className='mb-4 w-full rounded border px-4 py-2'
      />

      <div className='max-h-96 space-y-2 overflow-y-auto rounded border p-2'>
        {loading ? (
          <p>Loading tutors...</p>
        ) : filteredTrainers.length === 0 ? (
          <p>No tutors found.</p>
        ) : (
          filteredTrainers.map((trainer) => (
            <label
              key={trainer._id}
              className='flex cursor-pointer items-center gap-4 rounded p-2 hover:bg-gray-100'
            >
              <input
                type='radio'
                checked={selectedTutor === trainer._id}
                onChange={() => setSelectedTutor(trainer._id)}
              />

              <img
                src={trainer.image}
                alt={trainer.name}
                className='h-12 w-12 rounded-full object-cover'
              />

              <div>
                <p className='font-medium'>{trainer.name}</p>

                <p className='text-sm text-gray-500'>{trainer.language}</p>
              </div>
            </label>
          ))
        )}
      </div>

      <button
        onClick={handleAdd}
        disabled={!selectedTutor || creating}
        className='mt-4 rounded bg-blue-600 px-6 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50'
      >
        {creating ? "Adding..." : "Add Hero Tutor"}
      </button>
    </section>
  );
}
