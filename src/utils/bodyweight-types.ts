export type BodyweightGoal = "lose" | "maintain" | "gain";
export type WeightUnit = "kg" | "lbs";

export interface BodyweightLog {
  id: number;
  date: string;
  weight: number;
  image_uri?: string | null;
}

export interface BodyweightSettings {
  weightUnit: WeightUnit;
}

export interface BodyweightGoalSettings {
  goal: BodyweightGoal;
  weeklyTarget: number;
}

export interface BodyweightPhase {
  id: number;
  name: string;
  goal: BodyweightGoal;
  weeklyTarget: number;
  durationWeeks: number;
  startedOn: string;
  endedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BodyweightPhaseDraft = Pick<
  BodyweightPhase,
  "name" | "goal" | "weeklyTarget" | "durationWeeks"
>;
