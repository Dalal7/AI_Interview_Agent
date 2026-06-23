import { z } from "zod";

export const blueprintSchema = z.object({
  program: z.object({
    name: z.string().min(1, "Program name is required"),
    description: z.string().min(1, "Program description is required"),
    type: z.string().min(1, "Program type is required"),
    duration_weeks: z.number().min(1, "Duration must be at least 1 week"),
    cohort_size: z.number().min(1, "Cohort size must be at least 1")
  }),

  candidate_profile: z.object({
    target_audience: z.array(z.string()).min(1, "Must add at least one target audience"),
    experience_level: z.string().min(1, "Experience level is required"),
    minimum_requirements: z.array(z.string()).min(1, "Must add at least one requirement")
  }),

  interview_objective: z.object({
    purpose: z.string().min(1, "Interview purpose is required"),
    success_definition: z.string().min(1, "Success definition is required")
  }),

  interview_structure: z.object({
    type: z.enum(["structured", "semi_structured", "adaptive"]),
    total_duration_minutes: z.number().min(1, "Total duration must be greater than 0"),
    sections: z.array(
      z.object({
        name: z.string().min(1, "Section name is required"),
        duration_minutes: z.number().min(1, "Section duration must be greater than 0"),
        objective: z.string().min(1, "Section objective is required"),
        focus_competencies: z.array(z.string()).min(1, "Select at least one competency")
      })
    ).min(1, "Must have at least one interview section")
  }),

  competencies: z.array(
    z.object({
      name: z.string().min(1, "Competency name is required"),
      weight: z.number().min(0).max(100, "Weight must be between 0 and 100"),
      description: z.string().min(1, "Competency description is required")
    })
  ).min(1, "Must specify at least one competency"),

  skills: z.object({
    required: z.array(z.string()).min(1, "Must specify at least one required skill"),
    preferred: z.array(z.string()),
    bonus: z.array(z.string())
  }),

  question_strategy: z.object({
    mode: z.enum(["fixed", "bank", "ai_generated", "hybrid"]),
    adaptive_enabled: z.boolean(),
    follow_up_depth_limit: z.number().min(0, "Follow-up limit cannot be negative")
  }),

  evaluation_rubric: z.object({
    criteria: z.array(
      z.object({
        name: z.string().min(1, "Criteria name is required"),
        weight: z.number().min(0).max(100, "Weight must be between 0 and 100"),
        scale: z.enum(["0-5", "0-10", "0-100"])
      })
    ).min(1, "Must specify at least one evaluation criteria")
  }),

  scoring: z.object({
    overall_scale: z.number().min(1, "Overall scale must be at least 1"),
    pass_threshold: z.number().min(0, "Pass threshold cannot be negative"),
    weights: z.object({
      technical: z.number().min(0).max(100),
      communication: z.number().min(0).max(100),
      problem_solving: z.number().min(0).max(100)
    })
  }),

  decision_rules: z.object({
    auto_accept_threshold: z.number().min(0),
    auto_reject_threshold: z.number().min(0),
    human_review_range: z.object({
      min: z.number().min(0),
      max: z.number().min(0)
    })
  }),

  agent_configuration: z.object({
    tone: z.enum(["professional", "friendly", "formal", "encouraging"]),
    verbosity: z.enum(["low", "medium", "high"]),
    language: z.string().min(1, "Language is required")
  })
});

export interface ValidationReport {
  isValid: boolean;
  errors: { [key: string]: string };
  warnings: string[];
}

export function validateBlueprint(blueprint: any): ValidationReport {
  const result = blueprintSchema.safeParse(blueprint);
  const errors: { [key: string]: string } = {};
  const warnings: string[] = [];

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      errors[path] = issue.message;
    });
  }

  // Perform soft check validation warnings
  if (blueprint) {
    // 1. Competency weights sum check
    if (Array.isArray(blueprint.competencies)) {
      const sumCompetencies = blueprint.competencies.reduce((acc: number, curr: any) => acc + (Number(curr?.weight) || 0), 0);
      if (sumCompetencies !== 100) {
        warnings.push(`Competency weights sum to ${sumCompetencies}%. They should sum to exactly 100% for balanced evaluation.`);
      }
    }

    // 2. Evaluation criteria weights sum check
    if (blueprint.evaluation_rubric && Array.isArray(blueprint.evaluation_rubric.criteria)) {
      const sumCriteria = blueprint.evaluation_rubric.criteria.reduce((acc: number, curr: any) => acc + (Number(curr?.weight) || 0), 0);
      if (sumCriteria !== 100 && blueprint.evaluation_rubric.criteria.length > 0) {
        warnings.push(`Evaluation rubric criteria weights sum to ${sumCriteria}%. They should sum to exactly 100%.`);
      }
    }

    // 3. Scoring weights sum check
    if (blueprint.scoring && blueprint.scoring.weights) {
      const { technical = 0, communication = 0, problem_solving = 0 } = blueprint.scoring.weights;
      const sumWeights = Number(technical) + Number(communication) + Number(problem_solving);
      if (sumWeights !== 100) {
        warnings.push(`Scoring category weights (Technical + Communication + Problem Solving) sum to ${sumWeights}%. Ideally they sum to 100%.`);
      }
    }

    // 4. Section duration matching total duration
    if (blueprint.interview_structure && Array.isArray(blueprint.interview_structure.sections)) {
      const sumSections = blueprint.interview_structure.sections.reduce((acc: number, curr: any) => acc + (Number(curr?.duration_minutes) || 0), 0);
      const totalDuration = Number(blueprint.interview_structure.total_duration_minutes) || 0;
      if (sumSections !== totalDuration) {
        warnings.push(`Interview sections sum up to ${sumSections} minutes, which does not match the stated total duration of ${totalDuration} minutes.`);
      }
    }

    // 5. Decision thresholds alignment with scoring scale
    if (blueprint.scoring && blueprint.decision_rules) {
      const scale = Number(blueprint.scoring.overall_scale) || 100;
      const pass = Number(blueprint.scoring.pass_threshold) || 0;
      const autoAccept = Number(blueprint.decision_rules.auto_accept_threshold) || 0;
      const autoReject = Number(blueprint.decision_rules.auto_reject_threshold) || 0;
      const minReview = Number(blueprint.decision_rules.human_review_range?.min) || 0;
      const maxReview = Number(blueprint.decision_rules.human_review_range?.max) || 0;

      if (pass > scale) {
        warnings.push(`Pass threshold (${pass}) exceeds the overall scale (${scale}).`);
      }
      if (autoAccept > scale) {
        warnings.push(`Auto-accept threshold (${autoAccept}) exceeds the overall scale (${scale}).`);
      }
      if (autoReject > scale) {
        warnings.push(`Auto-reject threshold (${autoReject}) exceeds the overall scale (${scale}).`);
      }
      if (autoReject > autoAccept) {
        warnings.push(`Auto-reject threshold (${autoReject}) is higher than auto-accept threshold (${autoAccept}).`);
      }
      if (minReview > maxReview) {
        warnings.push(`Human review range minimum (${minReview}) is higher than maximum (${maxReview}).`);
      }
      if (autoReject > minReview || autoAccept < maxReview) {
        warnings.push(`Decision thresholds check: Ensure Auto-Reject (${autoReject}) <= Review Min (${minReview}) and Auto-Accept (${autoAccept}) >= Review Max (${maxReview}).`);
      }
    }
  }

  return {
    isValid: result.success && warnings.length === 0,
    errors,
    warnings
  };
}
