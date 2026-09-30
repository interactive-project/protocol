/** Projection of ActivitySpec v1; validate external values against JSON Schema. */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type ActivityType =
  | 'interactive-project/quiz'
  | 'interactive-project/flashcards'
  | 'interactive-project/code'
  | 'interactive-project/simulation'
  | 'interactive-project/diagram'
  | 'interactive-project/whiteboard';
export type Difficulty = 'introductory' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
export interface ActivitySpec {
  protocolVersion: '1.0.0';
  id: string;
  type: ActivityType;
  activitySchemaVersion: string;
  metadata: {
    title: string;
    description?: string;
    concepts?: string[];
    competencies?: string[];
    difficulty?: Difficulty;
    estimatedDuration?: { value: number; unit: 'seconds' };
  };
  config: { [key: string]: JsonValue };
  extensions?: { [key: string]: JsonValue };
}
