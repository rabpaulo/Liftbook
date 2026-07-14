export type ExerciseType = "weight_reps";
export type RirValue = null | 0 | 1 | 2;
export type WorkoutStatus = "active" | "completed" | "abandoned";

export interface Exercise {
  id: string;
  name: string;
  notes: string | null;
  category: string;
  type: ExerciseType;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateExercise {
  id: string;
  templateId: string;
  exerciseId: string;
  position: number;
  defaultSetCount: number | null;
  notesOverride: string | null;
  exercise: Exercise;
}

export interface WorkoutTemplateDetail extends WorkoutTemplate {
  exercises: TemplateExercise[];
}

export interface WorkoutSet {
  id: string;
  sessionExerciseId: string;
  position: number;
  weight: number | null;
  repetitions: number | null;
  rir: RirValue;
  comment: string | null;
  isCompleted: boolean;
  videoUri: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExercisePersonalRecords {
  highestWeight: number | null;
  highestRepetitions: number | null;
}

export interface SetPersonalRecord {
  weight: boolean;
  repetitions: boolean;
}

export interface SessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string | null;
  exerciseName: string;
  exerciseCategory: string;
  exerciseType: ExerciseType;
  exerciseNotes: string | null;
  position: number;
  sets: WorkoutSet[];
  previousSets?: WorkoutSet[];
  priorPersonalRecords?: ExercisePersonalRecords;
}

export interface WorkoutSession {
  id: string;
  templateId: string | null;
  name: string;
  notes: string | null;
  status: WorkoutStatus;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSessionDetail extends WorkoutSession {
  exercises: SessionExercise[];
}

export interface WorkoutSummary {
  exerciseCount: number;
  completedResistanceSets: number;
  completedSetCount: number;
}

export interface WorkoutHistoryItem extends WorkoutSession {
  exerciseCount: number;
  completedSetCount: number;
}

export interface ExerciseBestPerformance {
  highestWeight: number | null;
  estimatedOneRepMax: number | null;
}

export const SUGGESTED_CATEGORIES = [
  "Chest",
  "Lats",
  "Upper Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Other",
] as const;
