import { InterviewBlueprint } from "../types/blueprint";

export interface BlueprintTemplate {
  id: string;
  name: string;
  description: string;
  blueprint: InterviewBlueprint;
}

export const templates: BlueprintTemplate[] = [
  {
    id: "ai-admissions",
    name: "(Recommended) AI Admissions Interview (Default)",
    description: "The default AI and Machine Learning engineering bootcamp admissions blueprint checking Python, Git, ML/NLP, RAG, and Agentic AI concepts.",
    blueprint: {
      program: {
        name: "AI & Machine Learning Engineering Bootcamp",
        description: "Comprehensive hands-on training program in machine learning models, NLP pipelines, vector retrieval (RAG), and agentic workflows.",
        type: "Full-Time Technical Career Accelerator",
        duration_weeks: 16,
        cohort_size: 30
      },
      candidate_profile: {
        target_audience: ["Software Developers", "STEM Graduates", "Self-Taught Engineers"],
        experience_level: "Intermediate / Entry-Level AI",
        minimum_requirements: [
          "Proficiency in Python programming basics",
          "Understanding of version control using Git & GitHub",
          "Motivation & Commitment",
          "Learning & Problem Solving",
          "Teamwork & Collaboration",
          "Projects & Experience",
          "Python",
          "Machine Learning",
          "NLP",
          "Agentic AI",
          "RAG",
          "LLMs",
          "Git & GitHub",
          "Agentic AI Deep-Dive"
        ]
      },
      interview_objective: {
        purpose: "Evaluate core coding proficiency, version control competence, baseline AI concepts, and general software development background.",
        success_definition: "Candidate shows a strong motivation for AI, handles simple loops/functions in Python, understands code organization, and shows adaptive learning capabilities."
      },
      interview_structure: {
        type: "semi_structured",
        total_duration_minutes: 50,
        sections: [
          {
            name: "Candidate Background & Motivation",
            duration_minutes: 10,
            objective: "Assess background, motivation, learning style, and teamwork capabilities.",
            focus_competencies: ["Background & Collaboration"]
          },
          {
            name: "Coding & Git Competence",
            duration_minutes: 15,
            objective: "Evaluate Python scripting foundations and version control workflow.",
            focus_competencies: ["Programming Skills"]
          },
          {
            name: "Core AI Concepts (ML, NLP, RAG)",
            duration_minutes: 20,
            objective: "Check foundational understanding of machine learning models, NLP, and RAG architectures.",
            focus_competencies: ["AI Foundations"]
          },
          {
            name: "Wrap-up & Q&A",
            duration_minutes: 5,
            objective: "Address applicant questions and clarify admissions process timeline.",
            focus_competencies: ["Communication"]
          }
        ]
      },
      competencies: [
        {
          name: "Programming Skills",
          weight: 35,
          description: "Python scripting, logical loops, functions, and Git/GitHub code management skills."
        },
        {
          name: "AI Foundations",
          weight: 45,
          description: "Grasping ML foundations, NLP principles, LLM mechanisms, RAG, and Agentic loops."
        },
        {
          name: "Background & Collaboration",
          weight: 20,
          description: "Motivation to learn, collaboration in team settings, and software project experience."
        }
      ],
      skills: {
        required: ["Python", "Git", "GitHub"],
        preferred: ["Machine Learning Basics", "Data Structures", "NLP Concepts"],
        bonus: ["RAG Pipelines", "LLM APIs", "Agentic AI Loops"]
      },
      question_strategy: {
        mode: "hybrid",
        adaptive_enabled: true,
        follow_up_depth_limit: 2
      },
      evaluation_rubric: {
        criteria: [
          { name: "Technical Accuracy (AI/ML & Python)", weight: 40, scale: "0-5" },
          { name: "Problem Solving & Logical Depth", weight: 30, scale: "0-5" },
          { name: "Communication Clarity", weight: 15, scale: "0-5" },
          { name: "Adaptability & Feedback Reception", weight: 15, scale: "0-5" }
        ]
      },
      scoring: {
        overall_scale: 100,
        pass_threshold: 70,
        weights: {
          technical: 40,
          communication: 30,
          problem_solving: 30
        }
      },
      decision_rules: {
        auto_accept_threshold: 85,
        auto_reject_threshold: 55,
        human_review_range: { min: 55, max: 85 }
      },
      agent_configuration: {
        tone: "professional",
        verbosity: "medium",
        language: "English"
      }
    }
  },
  {
    id: "fullstack-eng",
    name: "Full-Stack Software Engineer",
    description: "Standard mid-to-senior technical interview template assessing architecture, coding, and system design.",
    blueprint: {
      program: {
        name: "Software Engineering Bootcamp",
        description: "Intensive training program focusing on React, Node.js, and Cloud Architectures.",
        type: "Full-Time Career Accelerator",
        duration_weeks: 12,
        cohort_size: 45
      },
      candidate_profile: {
        target_audience: ["Bootcamp Graduates", "Career Switchers", "Junior Developers"],
        experience_level: "Associate / Junior",
        minimum_requirements: [
          "Basic proficiency in JavaScript/HTML/CSS",
          "Understanding of databases and REST APIs",
          "Familiarity with git and version control"
        ]
      },
      interview_objective: {
        purpose: "Assess technical competence, problem-solving speed, and engineering communication skills.",
        success_definition: "Candidate builds a functional web route, explains architectural choices, and displays high coachability."
      },
      interview_structure: {
        type: "semi_structured",
        total_duration_minutes: 60,
        sections: [
          {
            name: "Warmup & Icebreaker",
            duration_minutes: 10,
            objective: "Set candidate at ease and evaluate high-level career motivations.",
            focus_competencies: ["Communication"]
          },
          {
            name: "Live Coding Challenge",
            duration_minutes: 30,
            objective: "Implement a data parsing algorithm in JS/TS and check core styling skills.",
            focus_competencies: ["Technical", "Problem Solving"]
          },
          {
            name: "System Design Discussion",
            duration_minutes: 15,
            objective: "Design a simple chat app database structure.",
            focus_competencies: ["Technical", "Problem Solving"]
          },
          {
            name: "Q&A and Wrap-up",
            duration_minutes: 5,
            objective: "Allow the candidate to ask questions and set expectations.",
            focus_competencies: ["Communication"]
          }
        ]
      },
      competencies: [
        {
          name: "Technical",
          weight: 45,
          description: "Proficiency in JavaScript/TypeScript, logic, debugging, and systems thinking."
        },
        {
          name: "Problem Solving",
          weight: 35,
          description: "Ability to break down complex issues, adapt to constraints, and code step-by-step."
        },
        {
          name: "Communication",
          weight: 20,
          description: "Articulating ideas clearly, listening actively, and taking critical feedback constructively."
        }
      ],
      skills: {
        required: ["React", "JavaScript", "HTML/CSS", "Git"],
        preferred: ["Node.js", "Express", "PostgreSQL"],
        bonus: ["Docker", "TypeScript", "AWS Basics"]
      },
      question_strategy: {
        mode: "hybrid",
        adaptive_enabled: true,
        follow_up_depth_limit: 3
      },
      evaluation_rubric: {
        criteria: [
          { name: "Code Correctness & Syntax", weight: 30, scale: "0-5" },
          { name: "System Architecture Design", weight: 25, scale: "0-5" },
          { name: "Technical Communication", weight: 25, scale: "0-5" },
          { name: "Adaptability & Feedback Reception", weight: 20, scale: "0-5" }
        ]
      },
      scoring: {
        overall_scale: 100,
        pass_threshold: 70,
        weights: {
          technical: 50,
          communication: 25,
          problem_solving: 25
        }
      },
      decision_rules: {
        auto_accept_threshold: 85,
        auto_reject_threshold: 55,
        human_review_range: { min: 55, max: 85 }
      },
      agent_configuration: {
        tone: "friendly",
        verbosity: "medium",
        language: "English"
      }
    }
  },
  {
    id: "product-manager",
    name: "Product Manager (Generalist)",
    description: "Evaluates product strategy, market insights, execution, and user empathy.",
    blueprint: {
      program: {
        name: "Product Management Leadership Academy",
        description: "Executive training in product strategy, data analysis, and cross-functional leadership.",
        type: "Part-Time Cohort",
        duration_weeks: 8,
        cohort_size: 25
      },
      candidate_profile: {
        target_audience: ["Business Analysts", "Project Managers", "Technical Lead transitions"],
        experience_level: "Mid-level",
        minimum_requirements: [
          "2+ years of experience in product, engineering, or design teams",
          "Basic understanding of agile methodologies",
          "Strong data analysis foundations"
        ]
      },
      interview_objective: {
        purpose: "Measure user empathy, strategic prioritization, data-driven decisions, and cross-functional leadership.",
        success_definition: "Candidate structures a product launch step-by-step, defines solid success metrics, and balances tradeoffs."
      },
      interview_structure: {
        type: "structured",
        total_duration_minutes: 45,
        sections: [
          {
            name: "Introductions & Resume Overview",
            duration_minutes: 5,
            objective: "Establish context and align on roles.",
            focus_competencies: ["Communication"]
          },
          {
            name: "Product Design & Empathy Case Study",
            duration_minutes: 20,
            objective: "Design a ridesharing service for senior citizens, evaluating user research and prioritization.",
            focus_competencies: ["Problem Solving"]
          },
          {
            name: "Execution & Analytical Metrics",
            duration_minutes: 15,
            objective: "Define north star metrics for a feature drop and model a mock AB-test.",
            focus_competencies: ["Technical", "Problem Solving"]
          },
          {
            name: "Candidate Questions",
            duration_minutes: 5,
            objective: "Provide transparency on company culture and PM scope.",
            focus_competencies: ["Communication"]
          }
        ]
      },
      competencies: [
        {
          name: "Problem Solving",
          weight: 40,
          description: "Product intuition, user empathy, feature design, and systematic prioritizations."
        },
        {
          name: "Technical",
          weight: 30,
          description: "Data analysis, telemetry setup, AB-testing models, and engineering collaboration."
        },
        {
          name: "Communication",
          weight: 30,
          description: "Stakeholder management, clear verbal structuring, and storytelling capabilities."
        }
      ],
      skills: {
        required: ["Product Strategy", "KPI Modeling", "User Research", "Agile Roadmap"],
        preferred: ["SQL", "Figma", "Jira", "A/B Testing"],
        bonus: ["Python", "Product Analytics Tooling", "Growth Marketing"]
      },
      question_strategy: {
        mode: "bank",
        adaptive_enabled: false,
        follow_up_depth_limit: 1
      },
      evaluation_rubric: {
        criteria: [
          { name: "User Empathy & Insight", weight: 35, scale: "0-10" },
          { name: "Analytical Prioritization Framework", weight: 35, scale: "0-10" },
          { name: "Executive Presentation", weight: 30, scale: "0-10" }
        ]
      },
      scoring: {
        overall_scale: 10,
        pass_threshold: 7.5,
        weights: {
          technical: 30,
          communication: 35,
          problem_solving: 35
        }
      },
      decision_rules: {
        auto_accept_threshold: 8.5,
        auto_reject_threshold: 6.0,
        human_review_range: { min: 6.0, max: 8.5 }
      },
      agent_configuration: {
        tone: "professional",
        verbosity: "medium",
        language: "English"
      }
    }
  }
];
