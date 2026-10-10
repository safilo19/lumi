"use client";
// Small loader hooks over the IndexedDB store so pages can read notes without
// repeating the same load/loading/mounted plumbing. Each returns the data plus
// a loading flag; reads run in an effect after mount (IndexedDB is browser-only).
import { useEffect, useState } from "react";
import type { Note } from "@/lib/mock-data";
import {
  listNotes,
  listNotesForCourse,
  getNote,
  countNotesByCourse,
} from "./notes";

export function useNotes() {
  const [data, setData] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let on = true;
    listNotes().then((d) => {
      if (!on) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      on = false;
    };
  }, []);
  return { data, loading };
}

export function useCourseNotes(courseId: string) {
  // Keep the loaded data tagged with the courseId it came from so `loading` can
  // be derived during render (true until the stored key matches the current
  // courseId) rather than reset with a synchronous setState inside the effect.
  const [state, setState] = useState<{ key: string; data: Note[] }>();
  useEffect(() => {
    let on = true;
    listNotesForCourse(courseId).then((d) => {
      if (!on) return;
      setState({ key: courseId, data: d });
    });
    return () => {
      on = false;
    };
  }, [courseId]);
  const loading = state?.key !== courseId;
  return { data: loading ? [] : state!.data, loading };
}

export function useNote(id: string) {
  const [state, setState] = useState<{ key: string; data: Note | undefined }>();
  useEffect(() => {
    let on = true;
    getNote(id).then((d) => {
      if (!on) return;
      setState({ key: id, data: d });
    });
    return () => {
      on = false;
    };
  }, [id]);
  const loading = state?.key !== id;
  return { data: loading ? undefined : state!.data, loading };
}

export function useNoteCounts() {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let on = true;
    countNotesByCourse().then((d) => {
      if (!on) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      on = false;
    };
  }, []);
  return { data, loading };
}
