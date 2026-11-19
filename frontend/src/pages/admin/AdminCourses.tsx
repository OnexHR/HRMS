import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Trash2, Plus, Edit, X } from "lucide-react";
import { Course, CourseLesson, CoursePayload } from "../../types/Course";
import { useCreateCourse } from "../../hooks/useCreateCourse";
import { useUpdateCourse } from "../../hooks/useUpdateCourse";
import { useCourses } from "../../hooks/useCourses";
import { useDeleteCourse } from "../../hooks/useDeleteCourse";
import { TaxonomySelect } from "../../components/taxonomy/TaxonomySelect";

type TaxonomyKind = "subjects" | "languages" | "hobbies";

const TEACHES_KINDS: { value: TaxonomyKind; label: string }[] = [
  { value: "languages", label: "Language" },
  { value: "subjects", label: "Subject" },
  { value: "hobbies", label: "Hobby" },
];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper: Upload to Cloudflare R2
const uploadToR2 = async (file: File, folderSub: string) => {
  const token = localStorage.getItem("token");

  // 1. URL lane ke liye Axios theek hai
  const resUrl = await axios.post(
    `${API_BASE_URL}/api/upload/get-upload-url`,
    {
      fileName: file.name,
      fileType: file.type,
      folderMain: "courses",
      folderSub: folderSub,
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const { uploadUrl, key } = resUrl.data;

  // 2. Upload karne ke liye FETCH use karenge (Axios yahan signature hag deta hai)
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  // Agar phir bhi fail hua, toh hume exact reason console me dikh jayega
  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    console.error("R2 Upload Failed Detail:", errorText);
    throw new Error("Upload Failed");
  }

  return key;
};

const AdminCourses: React.FC = () => {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [descriptionPoints, setDescriptionPoints] = useState<string[]>([""]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [overview, setOverview] = useState("");
  const [currency, setCurrency] = useState<CoursePayload["currency"]>("INR");
  const [level, setLevel] = useState<CoursePayload["level"]>("Beginner");
  const [teachesKind, setTeachesKind] =
    useState<TaxonomyKind>("languages");
  const [teachesValue, setTeachesValue] = useState<string[]>([]);
  const [curriculumPoints, setCurriculumPoints] = useState<CourseLesson[]>([{ title: "" }]);

  // Always the number of filled rows, never typed, so it cannot disagree.
  const lessonCount = curriculumPoints.filter((p) => p.title.trim() !== "").length;

  const [durationWeeks, setDurationWeeks] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [featured, setFeatured] = useState(false);

  const [thumbnailUploading, setThumbnailUploading] = useState<boolean>(false);

  const {
    courses,
    loading: fetchCoursesLoading,
    refetch: fetchCourses,
  } = useCourses({});

  const { createCourse, loading: createCourseLoading } = useCreateCourse();
  const { updateCourse, loading: updateCourseLoading } = useUpdateCourse();
  const { deleteCourse } = useDeleteCourse();

  const submitting =
    thumbnailUploading || createCourseLoading || updateCourseLoading;

  const [pricing, setPricing] = useState({
    inHouse: {
      oneToOne: "",
      group: "",
    },
    international: {
      oneToOne: "",
      group: "",
    },
  });

  const tableBody = useMemo(() => {
    return courses.map((course) => (
      <tr key={course._id} className="border-b hover:bg-gray-50">
        <td className="px-4 py-3">
          <ThumbnailCell thumbnailKey={course.thumbnail} />
        </td>
        <td className="px-4 py-3 font-medium">{course.title}</td>
        <td className="px-4 py-3 text-center">
          {course.lessons ?? <span className="text-gray-400">—</span>}
        </td>
        <td className="px-4 py-3 text-center">
          {course.featured ? (
            <span className="text-yellow-600 font-medium">★ Featured</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-center flex justify-center gap-3">
          <button
            onClick={() => handleEdit(course)}
            className="text-blue-600 hover:text-blue-800"
            title="Edit course"
          >
            <Edit size={18} />
          </button>

          <button
            onClick={() => handleDelete(course._id)}
            className="text-red-600 hover:text-red-800"
            title="Delete course"
          >
            <Trash2 size={18} />
          </button>
        </td>
      </tr>
    ));
  }, [courses]);

  const resetFields = () => {
    setTitle("");
    setDescriptionPoints([""]);
    setThumbnailFile(null);
    setOverview("");
    setPricing({
      inHouse: {
        oneToOne: "",
        group: "",
      },
      international: {
        oneToOne: "",
        group: "",
      },
    });
    setCurrency("INR");
    setLevel("Beginner");
    setTeachesKind("languages");
    setTeachesValue([]);
    setCurriculumPoints([{ title: "" }]);
    setDurationWeeks("");
    setDurationHours("");
    setFeatured(false);

    const thumbInput = document.getElementById(
      "thumbInput",
    ) as HTMLInputElement | null;

    if (thumbInput) thumbInput.value = "";
  };

  const handleCreateCourse = async () => {
    const validDescriptionPoints = descriptionPoints.filter(
      (point) => point.trim() !== "",
    );

    const isFormValid =
      title.trim() &&
      thumbnailFile &&
      validDescriptionPoints.length > 0 &&
      overview.trim() &&
      pricing.inHouse.oneToOne &&
      pricing.inHouse.group &&
      pricing.international.oneToOne &&
      pricing.international.group;

    if (!isFormValid) {
      alert("All fields are required.");
      return;
    }
    if (curriculumPoints.filter((p) => p.title.trim() !== "").length === 0) {
      alert(
        "Add at least one lesson. Session progress is tracked against lessons, so a course without them cannot record what was taught.",
      );
      return;
    }

    if (teachesValue.length === 0) {
      alert(
        "Choose what this course teaches. Sales needs it to match tutors to students who buy this course.",
      );
      return;
    }

    // Upload files to R2
    setThumbnailUploading(true);
    const thumbnailKey = await uploadToR2(thumbnailFile, "thumbnails");
    setThumbnailUploading(false);

    // Filter out empty points
    const validPoints = descriptionPoints.filter((p) => p.trim() !== "");

    const payload: CoursePayload = {
      title,
      description: validPoints,
      overview,
      thumbnail: thumbnailKey,
      pdfUrl: "",
      lessons: lessonCount,
      inhousePricing: {
        batch: Number(pricing.inHouse.group),
        oneOnOne: Number(pricing.inHouse.oneToOne),
      },
      internationalPricing: {
        batch: Number(pricing.international.group),
        oneOnOne: Number(pricing.international.oneToOne),
      },
      currency,
      level,
      durationWeeks: durationWeeks.trim() ? Number(durationWeeks) : null,
      durationHours: durationHours.trim() ? Number(durationHours) : null,
      featured,
      teachesKind,
      teachesValue: teachesValue[0] ?? null,
      curriculum: curriculumPoints
        .filter((p) => p.title.trim() !== "")
        .map((p) => ({ ...p, title: p.title.trim() })),
    };

    const result = await createCourse(payload);

    if (!result.ok) {
      alert(result.error ?? "Failed to create course.");
    } else {
      alert("Course created successfully.");
      resetFields();
      fetchCourses();
    }
  };

  const handleEdit = (course: Course) => {
    setEditingId(course._id);
    setTitle(course.title);

    setDescriptionPoints(
      course.description && course.description.length > 0
        ? [...course.description]
        : [""],
    );
    setOverview(course.overview);
    setThumbnailFile(null);
    setPricing({
      inHouse: {
        oneToOne: course.inhousePricing.oneOnOne.toString(),
        group: course.inhousePricing.batch.toString(),
      },
      international: {
        oneToOne: course.internationalPricing.oneOnOne.toString(),
        group: course.internationalPricing.batch.toString(),
      },
    });
    setCurrency(course.currency);
    setLevel(course.level);
    setTeachesKind(course.teachesKind ?? "languages");
    setTeachesValue(course.teachesValue ? [course.teachesValue] : []);
    setCurriculumPoints(
      course.curriculum && course.curriculum.length > 0
        ? course.curriculum.map((lesson) => ({
            _id: lesson._id,
            title: lesson.title,
            summary: lesson.summary ?? "",
          }))
        : [{ title: "" }],
    );
    // NEW: fall back to empty string when null/undefined (old courses won't have these yet)
    setDurationWeeks(
      course.durationWeeks != null ? course.durationWeeks.toString() : "",
    );
    setDurationHours(
      course.durationHours != null ? course.durationHours.toString() : "",
    );
    setFeatured(course.featured ?? false);

    // Scroll up to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateCourse = async () => {
    if (!editingId) return;

    // Same rules as creating, caught here so the message names the field.
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }

    if (descriptionPoints.filter((p) => p.trim() !== "").length === 0) {
      alert("Add at least one description point.");
      return;
    }

    if (lessonCount === 0) {
      alert(
        "Add at least one lesson. Session progress is tracked against lessons, so a course without them cannot record what was taught.",
      );
      return;
    }

    if (teachesValue.length === 0) {
      alert(
        "Choose what this course teaches. Sales needs it to match tutors to students who buy this course.",
      );
      return;
    }

    const currentCourse = courses.find((c) => c._id === editingId);
    let thumbKey = currentCourse?.thumbnail || "";

    if (thumbnailFile) {
      thumbKey = await uploadToR2(thumbnailFile, "thumbnails");
    }

    const validPoints = descriptionPoints.filter((p) => p.trim() !== "");

    const payload: CoursePayload = {
      title,
      description: validPoints,
      overview,
      thumbnail: thumbKey,
      pdfUrl: "",
      lessons: lessonCount,
      inhousePricing: {
        batch: Number(pricing.inHouse.group),
        oneOnOne: Number(pricing.inHouse.oneToOne),
      },
      internationalPricing: {
        batch: Number(pricing.international.group),
        oneOnOne: Number(pricing.international.oneToOne),
      },
      currency,
      level,
      durationWeeks: durationWeeks.trim() ? Number(durationWeeks) : null,
      durationHours: durationHours.trim() ? Number(durationHours) : null,
      featured,
      teachesKind,
      teachesValue: teachesValue[0] ?? null,
      curriculum: curriculumPoints
        .filter((p) => p.title.trim() !== "")
        .map((p) => ({ ...p, title: p.title.trim() })),
    };

    const result = await updateCourse(editingId, payload);

    if (!result.ok) {
      alert(result.error ?? "Failed to update course.");
    } else {
      alert("Course updated successfully.");
      resetFields();
    }

    fetchCourses();
    setEditingId(null);
    resetFields();
  };

  // Add/Remove Points Logic
  const handlePointChange = (index: number, value: string) => {
    const newPoints = [...descriptionPoints];
    newPoints[index] = value;
    setDescriptionPoints(newPoints);
  };
  const addPoint = () => setDescriptionPoints([...descriptionPoints, ""]);
  const removePoint = (index: number) => {
    setDescriptionPoints(descriptionPoints.filter((_, i) => i !== index));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    const success = await deleteCourse(id);

    if (!success) {
      alert("Failed to delete course.");
    } else {
      alert("Course deleted successfully.");
      fetchCourses();
    }
  };

  if (fetchCoursesLoading)
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="glass-effect rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Courses</h2>
        <p className="text-gray-500 mb-1">Create course</p>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="grid grid-cols-1 gap-4 mb-2">
            {/* Course Title */}
            <input
              type="text"
              placeholder="Course title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border rounded-xl p-3 w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-gray-500">
              Description Points
            </label>
            {descriptionPoints.map((point, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder={`Point ${idx + 1}`}
                  value={point}
                  onChange={(e) => handlePointChange(idx, e.target.value)}
                  className="border rounded-xl p-3 w-full flex-1"
                />
                {descriptionPoints.length > 1 && (
                  <button
                    onClick={() => removePoint(idx)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addPoint}
              className="text-sm text-blue-600 font-medium hover:underline"
            >
              + Add another point
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-gray-500">
              Curriculum — lessons, in order
            </label>

            {curriculumPoints.map((point, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder={`Lesson ${idx + 1} — what is covered`}
                  value={point.title}
                  onChange={(e) =>
                    setCurriculumPoints((prev) =>
                      prev.map((p, i) =>
                        i === idx ? { ...p, title: e.target.value } : p,
                      ),
                    )
                  }
                  className="border rounded-xl p-3 w-full flex-1"
                />
                {curriculumPoints.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCurriculumPoints((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => setCurriculumPoints((prev) => [...prev, { title: "" }])}
              className="text-sm text-blue-600 font-medium hover:underline"
            >
              + Add another lesson
            </button>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">
              Overview
            </label>
            <p className="text-xs text-gray-400 mb-1">
              Markdown. Use ## for a section heading, - for bullets and --- for a
              divider. This is what renders in "About the Course".
            </p>

            <textarea
              rows={5}
              placeholder={[
                "## Goal",
                "",
                "What this course sets out to do.",
                "",
                "## Section heading",
                "",
                "What it covers.",
              ].join("\n")}
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              className="border rounded-xl p-3 w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-xl p-4">
              <h3 className="font-semibold mb-3">In-house Pricing</h3>

              <input
                type="number"
                placeholder="One-to-One"
                value={pricing.inHouse.oneToOne}
                onChange={(e) =>
                  setPricing({
                    ...pricing,
                    inHouse: {
                      ...pricing.inHouse,
                      oneToOne: e.target.value,
                    },
                  })
                }
                className="border rounded-xl p-3 w-full mb-3"
              />

              <input
                type="number"
                placeholder="Group"
                value={pricing.inHouse.group}
                onChange={(e) =>
                  setPricing({
                    ...pricing,
                    inHouse: {
                      ...pricing.inHouse,
                      group: e.target.value,
                    },
                  })
                }
                className="border rounded-xl p-3 w-full "
              />
            </div>

            <div className="border rounded-xl p-4">
              <h3 className="font-semibold mb-3">International Pricing</h3>

              <input
                type="number"
                placeholder="One-to-One"
                value={pricing.international.oneToOne}
                onChange={(e) =>
                  setPricing({
                    ...pricing,
                    international: {
                      ...pricing.international,
                      oneToOne: e.target.value,
                    },
                  })
                }
                className="border rounded-xl p-3 w-full mb-3"
              />

              <input
                type="number"
                placeholder="Group"
                value={pricing.international.group}
                onChange={(e) =>
                  setPricing({
                    ...pricing,
                    international: {
                      ...pricing.international,
                      group: e.target.value,
                    },
                  })
                }
                className="border rounded-xl p-3 w-full "
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Currency
              </label>

              <select
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value as CoursePayload["currency"])
                }
                className="border rounded-xl p-3 w-full bg-white"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">Level</label>

              <select
                value={level}
                onChange={(e) =>
                  setLevel(e.target.value as CoursePayload["level"])
                }
                className="border rounded-xl p-3 w-full bg-white"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </div>
            {/* The value picker reads the same catalogue tutors pick from. */}
            <div>
              <label className="block text-sm text-gray-500 mb-1">
                This course teaches — category
              </label>

              <select
                value={teachesKind}
                onChange={(e) => {
                  setTeachesKind(e.target.value as TaxonomyKind);
                  // Old value belongs to the old catalogue.
                  setTeachesValue([]);
    setCurriculumPoints([{ title: "" }]);
                }}
                className="border rounded-xl p-3 w-full bg-white"
              >
                {TEACHES_KINDS.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">
                This course teaches — which one
              </label>

              <TaxonomySelect
                kind={teachesKind}
                values={teachesValue}
                onChange={setTeachesValue}
                max={1}
                showChips={false}
                placeholder="Search and select"
              />

              <p className="text-[11px] text-gray-400 mt-1">
                Used to match tutors to students who buy this course.
              </p>
            </div>

            {/* Duration is now a single numeric field (weeks) — the old free-text field was removed */}
            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Approximate duration (weeks)
              </label>
              <p className="text-xs text-gray-400 mb-1">
                {lessonCount > 0
                  ? `${lessonCount} lessons at 4 a week is about ${Math.ceil(
                      lessonCount / 4,
                    )} weeks.`
                  : "Add lessons first and a suggestion appears here."}
              </p>
              <input
                type="number"
                min={1}
                placeholder="Eg: 3"
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(e.target.value)}
                className="border rounded-xl p-3 w-full"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Total duration (hours)
              </label>
              <p className="text-xs text-gray-400 mb-1">
                Shown on course cards and the course page instead of weeks.
              </p>
              <input
                type="number"
                min={0}
                step="0.5"
                placeholder="Eg: 21"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="border rounded-xl p-3 w-full"
              />
            </div>

            {/* NEW: highlight this course (e.g. "Recommended" badge) */}
            <div className="flex items-center gap-2">
              <input
                id="featuredCheckbox"
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300"
              />
              <label
                htmlFor="featuredCheckbox"
                className="text-sm text-gray-500"
              >
                Mark as Featured
              </label>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Number of Lessons
              </label>
              <div className="border rounded-xl p-3 w-full bg-gray-50 text-gray-700 flex items-center justify-between">
                <span className="font-semibold">{lessonCount}</span>
                <span className="text-xs text-gray-400">
                  counted from the curriculum below
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">
                Cover Image (Thumbnail)
              </label>
              <input
                id="thumbInput"
                type="file"
                accept="image/*"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                className="border rounded-xl p-3 w-full"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={editingId ? handleUpdateCourse : handleCreateCourse}
            disabled={submitting}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition ${
              editingId
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-[#0ea5a3] hover:bg-[#0c8f8d]"
            } text-white`}
          >
            <Plus size={18} />
            {submitting
              ? "Processing..."
              : editingId
                ? "Update Course"
                : "Create Course"}
          </button>

          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                resetFields();
              }}
              className="px-6 py-3 rounded-xl bg-gray-200 text-gray-500 hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {/* </div> */}

      {/* COURSES TABLE */}
      <div className="glass-effect rounded-2xl p-6 shadow-xl">
        {courses.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            No courses created.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl overflow-hidden">
              <thead className="bg-[#0ea5a3] text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Thumbnail</th>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-center">Lessons</th>
                  <th className="px-4 py-3 text-center">Featured</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>{tableBody}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const ThumbnailCell = ({ thumbnailKey }: { thumbnailKey: string }) => {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    if (!thumbnailKey) return;
    if (thumbnailKey.startsWith("http") || thumbnailKey.startsWith("data:")) {
      setUrl(thumbnailKey);
      return;
    }

    const fetchUrl = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.post(
          `${API_BASE_URL}/api/upload/get-download-url`,
          {
            fileKey: thumbnailKey,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setUrl(res.data.signedUrl);
      } catch (err) {
        console.error("Failed to load thumbnail", err);
      }
    };

    fetchUrl();
  }, [thumbnailKey]);

  if (!url)
    return <div className="w-16 h-10 bg-gray-200 animate-pulse rounded"></div>;

  return (
    <img
      src={url}
      alt="Course Thumbnail"
      className="w-16 h-10 object-cover rounded"
    />
  );
};

export default AdminCourses;
