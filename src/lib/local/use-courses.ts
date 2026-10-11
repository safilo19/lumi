"use client";
import { useEffect, useReducer } from "react";
import type { Course } from "@/lib/mock-data";
import {
  createCourse,
  deleteCourse,
  listCourses,
  restoreCourse,
} from "./courses";

// A tiny shared cache so every note card / page reads the course list once and
// re-renders together when a course is added or removed.
let cache: Course[] | null = null;
const subs = new Set<() => void>();

async function refresh() {
  cache = await listCourses();
  subs.forEach((f) => f());
}

export function useCourses() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    subs.add(force);
    if (cache === null) refresh();
    return () => {
      subs.delete(force);
    };
  }, []);
  return { data: cache ?? [], loading: cache === null };
}

export async function addCourse(input: { name: string; code?: string }) {
  const course = await createCourse(input);
  await refresh();
  return course;
}

export async function removeCourse(id: string): Promise<Course | undefined> {
  const course = await deleteCourse(id);
  await refresh();
  return course;
}

export async function undoRemoveCourse(course: Course) {
  await restoreCourse(course);
  await refresh();
}
