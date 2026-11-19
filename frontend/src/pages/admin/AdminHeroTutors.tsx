import { useCreateHeroTutor } from "../../hooks/useCreateHeroTutor";
import { useDeleteHeroTutor } from "../../hooks/useDeleteHeroTutor";
import { useFetchHeroTutors } from "../../hooks/useFetchHeroTutors";
import { useTrainers } from "../../hooks/useTrainers";
import HeroTutorList from "./components/HeroTutorList";
import HeroTutorSelector from "./components/HeroTutorSelector";

export default function HeroTutorAdminPage() {
  const { trainers, loading: trainersLoading } = useTrainers({
    page: "1",
    limit: "100",
  });

  const {
    heroTutors,
    loading: heroTutorsLoading,
    refetch,
  } = useFetchHeroTutors();

  const { createHeroTutor, loading: creating } = useCreateHeroTutor();
  const { deleteHeroTutor, loading: deleting } = useDeleteHeroTutor();

  const handleAdd = async (id: string) => {
    const success = await createHeroTutor({ tutor: id });

    if (success) {
      await refetch();
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteHeroTutor(id);

    if (success) {
      await refetch();
    }
  };

  return (
    <>
      <HeroTutorSelector
        trainers={trainers}
        loading={trainersLoading}
        creating={creating}
        onAdd={handleAdd}
      />

      <HeroTutorList
        tutors={heroTutors}
        loading={heroTutorsLoading}
        deleting={deleting}
        onDelete={handleDelete}
      />
    </>
  );
}
