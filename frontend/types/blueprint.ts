export interface InterviewBlueprint {
  program: {
    name: string;
    description: string;
    type: string;
    duration_weeks: number;
    cohort_size: number;
  };

  candidate_profile: {
    target_audience: string[];
    experience_level: string;
    minimum_requirements: string[];
  };

  interview_objective: {
    purpose: string;
    success_definition: string;
  };

  interview_structure: {
    type: "structured" | "semi_structured" | "adaptive";
    total_duration_minutes: number;
    sections: {
      name: string;
      duration_minutes: number;
      objective: string;
      focus_competencies: string[];
    }[];
  };

  competencies: {
    name: string;
    weight: number;
    description: string;
  }[];

  skills: {
    required: string[];
    preferred: string[];
    bonus: string[];
  };

  question_strategy: {
    mode: "fixed" | "bank" | "ai_generated" | "hybrid";
    adaptive_enabled: boolean;
    follow_up_depth_limit: number;
  };

  evaluation_rubric: {
    criteria: {
      name: string;
      weight: number;
      scale: "0-5" | "0-10" | "0-100";
    }[];
  };

  scoring: {
    overall_scale: number;
    pass_threshold: number;
    weights: {
      technical: number;
      communication: number;
      problem_solving: number;
    };
  };

  decision_rules: {
    auto_accept_threshold: number;
    auto_reject_threshold: number;
    human_review_range: { min: number; max: number };
  };

  agent_configuration: {
    tone: "professional" | "friendly" | "formal" | "encouraging";
    verbosity: "low" | "medium" | "high";
    language: string;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  blueprintUpdate?: Partial<InterviewBlueprint>;
  suggestedQuestions?: string[];
  validationWarnings?: string[];
}
