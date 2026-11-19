import { HeroTutor } from "../../../hooks/useFetchHeroTutors";
import userAvatar from "../../../assets/user_avatar.png";

type Props = {
  tutors: HeroTutor[];
  loading: boolean;
  deleting: boolean;
  onDelete: (id: string) => Promise<void>;
};

export default function HeroTutorList({
  tutors,
  loading,
  deleting,
  onDelete,
}: Props) {
  return (
    <section className='rounded-xl border p-6'>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-xl font-semibold'>Current Hero Tutors</h2>

        <span className='text-gray-500'>{tutors.length}/9</span>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : tutors.length === 0 ? (
        <p>No hero tutors yet.</p>
      ) : (
        <div className='space-y-3'>
          {tutors.map((tutor) => (
            <div
              key={tutor.id}
              className='flex items-center justify-between rounded-lg border p-3'
            >
              <div className='flex items-center gap-4'>
                <img
                  src={tutor.imgUrl || userAvatar}
                  alt={tutor.name}
                  className='h-14 w-14 rounded-full object-cover'
                />

                <div>
                  <p className='font-medium'>{tutor.name}</p>

                  <p className='text-sm text-gray-500'>{tutor.subject}</p>
                </div>
              </div>

              <button
                onClick={() => onDelete(tutor.id)}
                disabled={deleting}
                className='rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50'
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
