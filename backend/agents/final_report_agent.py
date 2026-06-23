import os
import json
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
from backend.schemas.interview_state import InterviewState
from backend.tools.scoring_tool import ScoringTool

class FinalReportResponseSchema(BaseModel):
    summary: str = Field(description="Executive summary of the candidate's performance and suitability")
    overall_score: float = Field(description="Aggregated score from 1.0 to 5.0")
    strengths: list[str] = Field(description="Top 3-4 strengths identified during the interview")
    weaknesses: list[str] = Field(description="Areas where the candidate showed limitations or gaps")
    skill_gaps: list[str] = Field(description="Specific technical skills or boot camp pre-requisites that are missing")
    recommendation: str = Field(description="Recommendation decision: ACCEPT, WAITLIST, or REJECT")

class FinalReportAgent:
    """
    Generates the final Admissions Assessment Report using gemini-3.1-flash-lite,
    aggregating scores and outputting structured recommendations.
    """

    @staticmethod
    def run(state: InterviewState) -> InterviewState:
        # Calculate cumulative score metrics
        overall_metrics = ScoringTool.calculate_overall_metrics(state.scores)
        score_val = overall_metrics["overall_score"]

        # Format transcript and current details
        transcript_turns = []
        for q, a in zip(state.question_history, state.answer_history):
            transcript_turns.append(f"Q: {q}\nA: {a}")
        transcript_text = "\n\n".join(transcript_turns)

        prompt = f"""You are the Admissions Committee Panel for a highly competitive technology training bootcamp.
Analyze the candidate's interview transcript, scores, and profile below to generate a final evaluation report.

Candidate Profile:
Name: {state.current_profile_data.get('candidate_name', 'Unknown')}
Email: {state.current_profile_data.get('email', 'Unknown')}
Extracted Profile: {state.current_profile_data}
Detected Skills: {state.detected_skills}
Missing Requirements: {state.missing_requirements}

Quantitative Scores:
Overall Cumulative Average: {score_val}
Individual question scores: {state.scores}

Full Interview Transcript:
{transcript_text}

Instructions:
1. Provide a concise, professional 3-4 sentence Executive Summary.
2. Outline specific Strengths and constructive Areas of Improvement (under the weaknesses field). Make the feedback sound encouraging, supportive, and growth-oriented.
3. Identify any technical Skill Gaps or bootcamp requirements that are missing.
4. Output one of the following recommendations:
    - ACCEPT: Overall score is strong/good (>= 3.5), no major blockages, fits the program requirements.
    - WAITLIST: Candidate has potential (>= 2.5) but lacks background or has key missing requirements.
    - REJECT: Candidate did not demonstrate required basic knowledge or commitment (< 2.5).

Return your evaluation report strictly as a JSON object matching the requested schema.
"""

        api_key = os.getenv("GEMINI_API_KEY")
        report_data = None

        if api_key:
            try:
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model="gemini-3.1-flash-lite",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=FinalReportResponseSchema,
                        temperature=0.2
                    )
                )
                report_data = json.loads(response.text.strip())
            except Exception as e:
                print(f"Error calling gemini-3.1-flash-lite in FinalReportAgent: {e}. Falling back to rule-based generation.")

        # Fallback generator if LLM fails or API Key is missing
        if not report_data:
            report_data = FinalReportAgent._fallback_report(state, score_val)

        # Write final evaluation findings to profile
        profile = state.current_profile_data or {}
        profile["overall_score"] = report_data["overall_score"]
        profile["recommendation"] = report_data["recommendation"]
        
        # Format the final report as clean Markdown to be displayed on the Admissions Dashboard
        markdown_report = f"""### Admissions Evaluation Report

Candidate Name: {profile.get('candidate_name', 'Anonymous Candidate')}
Email: {profile.get('email', 'N/A')}
Overall Score: {report_data['overall_score']}/5.0
Status Recommendation: {report_data['recommendation'].replace('_', ' ')}

---

#### Executive Summary
{report_data['summary']}

---

#### Strengths & Areas of Improvement
Strengths:
{chr(10).join([f"  - {s}" for s in report_data['strengths']])}

Areas of Improvement:
{chr(10).join([f"  - {w}" for w in report_data['weaknesses']])}

---

#### Technical Skill Gaps
{chr(10).join([f"- {gap}" for gap in report_data['skill_gaps']]) if report_data['skill_gaps'] else "No significant gaps identified."}
"""

        profile["final_evaluation"] = markdown_report
        
        # Merge lists to profile
        profile["strengths"] = report_data["strengths"]
        profile["weaknesses"] = report_data["weaknesses"]

        state.current_profile_data = profile
        state.interview_status = "completed"

        return state

    @staticmethod
    def _fallback_report(state: InterviewState, overall_score: float) -> dict:
        """
        Creates a rule-based evaluation report if Gemini is not accessible.
        """
        name = state.current_profile_data.get("candidate_name", "Anonymous Candidate")
        email = state.current_profile_data.get("email", "N/A")
        skills = ", ".join(state.detected_skills) if state.detected_skills else "none declared"

        # Recommendation logic
        if overall_score >= 3.5:
            rec = "ACCEPT"
            summary = f"Candidate {name} performed well, demonstrating core software concepts and good coding alignment. Recommended for acceptance."
        elif overall_score >= 2.5:
            rec = "WAITLIST"
            summary = f"Candidate {name} has basic fundamentals but struggled with some deeper engineering details or has significant missing requirements. Recommended for waitlisting."
        else:
            rec = "REJECT"
            summary = f"Candidate {name} demonstrated insufficient coding familiarity or time commitment to keep pace with our intensive program syllabus. Not recommended for admission."

        # Compile strengths & weaknesses from history
        strengths = state.strengths if state.strengths else ["Cooperative communication", "Basic tech familiarity"]
        weaknesses = state.weaknesses if state.weaknesses else ["Could elaborate on system design or coding tradeoffs"]
        
        # Skill gaps match missing requirements
        gaps = state.missing_requirements if state.missing_requirements else ["Advanced database schema design"]

        return {
            "summary": summary,
            "overall_score": overall_score,
            "strengths": strengths[:4],
            "weaknesses": weaknesses[:4],
            "skill_gaps": gaps,
            "recommendation": rec
        }
