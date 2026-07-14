import type {
  Exercise,
  ExerciseType,
  RirValue,
  SessionExercise,
  WorkoutSession,
  WorkoutSet,
  WorkoutStatus,
  WorkoutTemplate,
} from "@/utils/training-types";

export type ExerciseRow = {
  id: string;
  name: string;
  notes: string | null;
  category: string;
  type: ExerciseType;
  is_archived: number;
  created_at: string;
  updated_at: string;
};

export type TemplateRow = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionRow = {
  id: string;
  template_id: string | null;
  name: string;
  notes: string | null;
  status: WorkoutStatus;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionExerciseRow = {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  exercise_category: string;
  exercise_type: ExerciseType;
  exercise_notes: string | null;
  position: number;
};

export type SetRow = {
  id: string;
  session_exercise_id: string;
  position: number;
  weight: number | null;
  repetitions: number | null;
  rir: RirValue;
  comment: string | null;
  is_completed: number;
  video_uri: string | null;
  created_at: string;
  updated_at: string;
};

export function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    category: row.category,
    type: row.type,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTemplate(row: TemplateRow): WorkoutTemplate {
  return { id: row.id, name: row.name, notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function mapSession(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    templateId: row.template_id,
    name: row.name,
    notes: row.notes,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSet(row: SetRow): WorkoutSet {
  return {
    id: row.id,
    sessionExerciseId: row.session_exercise_id,
    position: row.position,
    weight: row.weight,
    repetitions: row.repetitions,
    rir: row.rir,
    comment: row.comment,
    isCompleted: row.is_completed === 1,
    videoUri: row.video_uri,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSessionExercise(row: SessionExerciseRow, sets: WorkoutSet[] = []): SessionExercise {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    exerciseCategory: row.exercise_category,
    exerciseType: row.exercise_type,
    exerciseNotes: row.exercise_notes,
    position: row.position,
    sets,
  };
}
