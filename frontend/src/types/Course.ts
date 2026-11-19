export type CourseLesson = {
  _id?: string;
  title: string;
  summary?: string;
};

export type Course = {
  _id: string;
  title: string;
  description?: string[];
  overview: string;
  thumbnail?: string;
  lessons?: number;
  featured?: boolean;
  currency: "INR" | "USD";
  level: "Beginner" | "Intermediate" | "Advanced";
  teachesKind?: "subjects" | "languages" | "hobbies";
  teachesValue?: string;
  curriculum?: CourseLesson[];
  durationWeeks?: number | null;
  durationHours?: number | null;
  inhousePricing: { oneOnOne: number; batch: number };
  internationalPricing: { oneOnOne: number; batch: number };
};

export type CoursePayload = {
  title: string;
  description: string[];
  overview: string;
  thumbnail: string;
  pdfUrl: string;
  lessons: number;
  inhousePricing: { oneOnOne: number; batch: number };
  internationalPricing: { oneOnOne: number; batch: number };
  currency: "INR" | "USD";
  level: "Beginner" | "Intermediate" | "Advanced";
  durationWeeks: number | null;
  durationHours: number | null;
  featured: boolean;
  teachesKind: "subjects" | "languages" | "hobbies";
  teachesValue: string;
  curriculum: CourseLesson[];
};
