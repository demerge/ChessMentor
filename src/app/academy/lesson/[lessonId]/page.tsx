"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { LESSON_BY_ID } from "@/academy/curriculum";
import { LessonPipeline } from "@/components/academy/LessonPipeline";
import { useAcademyStore } from "@/store/academyStore";

export default function AcademyLessonPage() {
  const params = useParams();
  const lessonId = String(params.lessonId ?? "");
  const lesson = LESSON_BY_ID[lessonId];
  const startLesson = useAcademyStore((s) => s.startLesson);
  const active = useAcademyStore((s) => s.activeLessonId);

  useEffect(() => {
    if (lesson && active !== lessonId) startLesson(lessonId);
  }, [lesson, lessonId, active, startLesson]);

  if (!lesson) {
    return (
      <AcademyShell title="Lesson not found">
        <Link href="/academy">Hub</Link>
      </AcademyShell>
    );
  }

  return (
    <AcademyShell>
      <div className="mb-4">
        <Link
          href={`/academy/${lesson.moduleId}`}
          className="font-mono text-[11px] text-ink/45 hover:text-ink"
        >
          ← {lesson.moduleId} module
        </Link>
      </div>
      <LessonPipeline lesson={lesson} />
    </AcademyShell>
  );
}
