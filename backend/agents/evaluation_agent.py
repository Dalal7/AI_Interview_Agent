import os
import json
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from backend.schemas.interview_state import InterviewState
from backend.tools.rag_retrieval_tool import rag_retriever
from backend.tools.scoring_tool import ScoringTool

class EvaluationResultSchema(BaseModel):
    overall_score: float = Field(description="Weighted average score from 1.0 to 5.0")
    technical_accuracy: int = Field(description="Technical accuracy rating from 1 to 5")
    depth: int = Field(description="Depth of understanding rating from 1 to 5")
    clarity: int = Field(description="Communication clarity rating from 1 to 5")
    relevance: int = Field(description="Relevance rating from 1 to 5")
    strengths: list[str] = Field(description="Key strengths demonstrated in the response")
    weaknesses: list[str] = Field(description="Areas of weakness or missing details in the response")

class EvaluationAgent:
    """
    Grades candidate answers using gemini-3.1-flash-lite against evaluation rubrics
    retrieved from RAG. Updates state scores, strengths, and weaknesses.
    """

    @staticmethod
    def run(state: InterviewState) -> InterviewState:
        # If no questions have been asked yet, skip evaluation
        if not state.question_history or not state.answer_history:
            return state

        # We evaluate the LAST question and answer
        last_question = state.question_history[-1]
        last_answer = state.answer_history[-1]

        # Retrieve relevant rubrics from RAG
        rubrics = rag_retriever.retrieve_rubrics(query=last_question, top_k=2)
        
        # System evaluation accuracy metrics
        rubric_found = len(rubrics) > 0
        rubric_match = any(
            r["category"].lower() in (state.target_requirement or "").lower() or
            (state.target_requirement or "").lower() in r["category"].lower()
            for r in rubrics
        ) if rubrics and state.target_requirement else False
        
        from backend.services.system_evaluation_service import SystemEvaluationService
        SystemEvaluationService.perform_accuracy_check(rubric_found=rubric_found, correct_bootcamp=rubric_match)

        rubric_text = "\n".join([f"- Category: {r['category']} | Score: {r['score']} | Desc: {r['description']}" for r in rubrics])

        # Load blueprint from database to configure custom criteria/weights/scale
        from backend.database.session import SessionLocal
        from backend.database.repository import InterviewRepository
        blueprint = None
        try:
            db = SessionLocal()
            try:
                blueprint = InterviewRepository.get_blueprint(db)
            finally:
                db.close()
        except Exception as e:
            print(f"Error loading blueprint in EvaluationAgent: {e}. Falling back to default criteria.")

        criteria_list = []
        if blueprint and blueprint.get("evaluation_rubric", {}).get("criteria"):
            for crit in blueprint["evaluation_rubric"]["criteria"]:
                name = crit.get("name")
                weight = crit.get("weight", 0)
                scale = crit.get("scale", "0-5")
                criteria_list.append(f"- {name} (Weight: {weight}%, Scale: {scale})")
        else:
            criteria_list = [
                "- Technical Accuracy (Weight: 25%, Scale: 0-5)",
                "- Depth of Understanding (Weight: 25%, Scale: 0-5)",
                "- Communication Clarity (Weight: 25%, Scale: 0-5)",
                "- Relevance (Weight: 25%, Scale: 0-5)"
            ]
        criteria_text = "\n".join(criteria_list)

        prompt = f"""You are an expert technical interviewer for a competitive software development bootcamp.
Your role is to evaluate the candidate's last answer to the interview question below.

Question Asked:
{last_question}

Candidate Answer:
{last_answer}

RAG Rubrics context:
{rubric_text}

Rate the answer on a scale from 1 to 5 for each category, mapping the evaluation criteria defined in the blueprint:
{criteria_text}

Please provide your evaluation as a JSON object matching the requested schema. Map the custom criteria ratings to the schema fields:
- technical_accuracy (maps to Technical Accuracy / tech skills)
- depth (maps to Depth of Understanding / problem solving)
- clarity (maps to Communication Clarity / soft skills)
- relevance (maps to Relevance / question alignment)

Compute the overall_score as the weighted average of these categories based on their configured weights (mapped to the 1.0 to 5.0 rating scale).
"""

        api_key = os.getenv("GEMINI_API_KEY")
        eval_result = None

        if api_key:
            try:
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model="gemini-3.1-flash-lite",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=EvaluationResultSchema,
                        temperature=0.1
                    )
                )
                
                # Parse JSON output
                eval_result = json.loads(response.text.strip())
            except Exception as e:
                print(f"Error calling gemini-3.1-flash-lite in EvaluationAgent: {e}. Falling back to default grading.")

        # Fallback grading mechanism if LLM fails or API Key is missing
        if not eval_result:
            eval_result = EvaluationAgent._fallback_evaluation(last_question, last_answer)

        # Update the state structures
        state.scores.append(eval_result)
        
        # Merge strengths/weaknesses into state aggregates
        for s in eval_result.get("strengths", []):
            if s not in state.strengths:
                state.strengths.append(s)
                
        for w in eval_result.get("weaknesses", []):
            if w not in state.weaknesses:
                state.weaknesses.append(w)

        return state

    @staticmethod
    def _fallback_evaluation(question: str, answer: str) -> dict:
        """
        Calculates a baseline grade based on answer length and simple text keywords
        to guarantee functional operation without Gemini API keys.
        """
        answer_len = len(answer.strip())
        
        # Baseline ratings
        tech = 3
        depth = 3
        clarity = 3
        relevance = 3
        strengths = []
        weaknesses = []

        if answer_len < 10:
            tech, depth, clarity, relevance = 1, 1, 1, 1
            strengths.append("Quick communication turn")
            weaknesses.append("Response was too short or non-substantive.")
        elif answer_len < 30:
            tech, depth, clarity, relevance = 2, 2, 3, 3
            strengths.append("Clear and concise response")
            weaknesses.append("Lacks technical elaboration or depth.")
        else:
            # Check for technical buzzwords
            tech_keywords = ["rendered", "client", "server", "data", "recursion", "stack", "call", "api", "database", "table", "key", "index", "code"]
            matched_keywords = [kw for kw in tech_keywords if kw in answer.lower()]
            
            if len(matched_keywords) >= 3:
                tech = 4
                depth = 4
                strengths.append("Incorporates technical terminology")
            else:
                weaknesses.append("Could benefit from using more industry standard vocabulary.")

            if len(answer.split()) > 40:
                depth = 4
                clarity = 4
                strengths.append("Elaborated details are well structured")
            else:
                weaknesses.append("Explain the tradeoffs or provide a code example next time.")

        overall = round((tech + depth + clarity + relevance) / 4.0, 2)

        return {
            "overall_score": overall,
            "technical_accuracy": tech,
            "depth": depth,
            "clarity": clarity,
            "relevance": relevance,
            "strengths": strengths,
            "weaknesses": weaknesses
        }
