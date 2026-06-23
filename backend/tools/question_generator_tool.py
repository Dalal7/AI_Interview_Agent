import os
from google import genai
from backend.tools.rag_retrieval_tool import rag_retriever

class QuestionGeneratorTool:
    """
    Formulates the next interview question using gemini-3.1-flash-lite,
    incorporating the current phase, candidate profile, history, and RAG contexts.
    """

    @staticmethod
    def is_similar_question(proposed: str, history: list, threshold: float = 0.6) -> bool:
        import re
        def tokenize(text: str):
            text = text.lower()
            text = re.sub(r'[^\w\s]', '', text)
            stopwords = {"what", "how", "why", "who", "which", "where", "when", "you", "your", "the", "and", "are", "with", "for", "about", "could", "would", "please", "tell", "describe", "share"}
            words = [w for w in text.split() if w and w not in stopwords]
            return set(words)
        
        p_tokens = tokenize(proposed)
        if not p_tokens:
            return False
            
        for h in history:
            h_tokens = tokenize(h)
            if not h_tokens:
                continue
            intersection = p_tokens.intersection(h_tokens)
            union = p_tokens.union(h_tokens)
            similarity = len(intersection) / len(union)
            if similarity > threshold or proposed.lower().strip("?. ") == h.lower().strip("?. "):
                return True
        return False

    @staticmethod
    def generate_question(
        candidate_id: str,
        phase: str,
        profile_data: dict,
        question_history: list,
        answer_history: list,
        next_action: str = "ask_first_question",
        target_requirement: str = None,
        evidence_map: dict = None,
        interview_summary: str = ""
    ) -> str:
        api_key = os.getenv("GEMINI_API_KEY")
        candidate_name = profile_data.get("candidate_name") or "Candidate"
        
        # 1. Query RAG for suggested questions matching the current target requirement's phase
        query_context = ""
        if answer_history:
            query_context = answer_history[-1]
            
        phase_for_rag = phase
        if target_requirement:
            from backend.agents.interview_orchestrator_agent import InterviewOrchestratorAgent
            phase_for_rag = InterviewOrchestratorAgent.PHASE_MAP.get(target_requirement, phase)
        
        # Retrieve top 10 candidates to ensure we have enough non-duplicate questions
        rag_suggestions = rag_retriever.retrieve_questions(query=query_context, phase=phase_for_rag, top_k=10)
        
        # Filter RAG suggestions to remove duplicates / similar questions
        unasked_rag_suggestions = [
            q for q in rag_suggestions 
            if not QuestionGeneratorTool.is_similar_question(q["question"], question_history)
        ]
        
        # Display the first few unasked suggestions to the model
        rag_text = "\n".join([f"- {q['question']} (Keywords: {q['keywords']})" for q in unasked_rag_suggestions[:3]])

        # 2. Formulate system guidelines based on the active target requirement & action
        action_instructions = {
            "ask_first_question": f"Welcome the candidate by their name (use '{candidate_name}'). Introduce yourself as the Admissions AI Screener for 1 Min Scout. Ask them to share a brief summary of what brings them here today.",
            "ask_follow_up": f"Probe deeper into the target requirement: '{target_requirement}'. The candidate's last answer was evaluated, but we need more details, clarity, or examples. Ask a follow-up question building directly on their last response.",
            "switch_topic": f"Gently transition the conversation to focus on the next target requirement: '{target_requirement}'. Acknowledge their previous answer and introduce this new topic naturally.",
            "wrap_up": "Inform the candidate that the screening is complete. Explain that their profile is being processed and will be reviewed by the admissions team shortly. Offer warm closing remarks.",
            "complete": "The interview is already fully completed. Thank them again and bid them farewell."
        }

        instruction = action_instructions.get(next_action, f"Ask a question to probe the target requirement: '{target_requirement}'.")

        # Format history
        history_text = ""
        for q, a in zip(question_history, answer_history):
            history_text += f"Q: {q}\nA: {a}\n"

        # Explicitly extract the last candidate answer
        last_candidate_answer = answer_history[-1] if answer_history else "None (this is the start of the interview)."

        prompt = f"""You are the Question Generator Tool for an Autonomous Bootcamp Admissions Agent.
Your task is to generate the NEXT natural and engaging interview question for a candidate.

Current Action to take: {next_action}
Target Requirement: {target_requirement}
Admissions Guideline: {instruction}

Candidate Profile (extracted so far):
{profile_data}

Candidate Interview Summary Memory:
{interview_summary}

Evidence Map state:
{evidence_map}

Previous Q&A Turns in this session:
{history_text}

RAG Suggestion Bank questions:
{rag_text}

Last Candidate Answer: {last_candidate_answer}

Instructions:
1. Ask at most 2 questions at a time (never ask more than 2 questions in a single response).
2. The question MUST build directly upon the candidate's last answer ('Last Candidate Answer'). If they mentioned a specific tool, technology, background detail, or project, prioritize asking a follow-up or clarifying question about that specific detail to probe further.
3. Never repeat any question or ask a very similar question that has already been asked in the 'Previous Q&A Turns' history.
4. Maintain a friendly, supportive, yet professional recruiter tone.
5. If this is the INTRODUCTION / first turn, welcome the candidate by their name (use '{candidate_name}'). Do not ask for their name or email since they have already provided them in the form.
6. Return only the raw text of the question(s). Do not add labels like "Question:" or markdown formatting.
"""

        # 3. Call Gemini 2.5 Flash with retry logic if duplicate question is generated
        if api_key:
            try:
                client = genai.Client(api_key=api_key)
                current_prompt = prompt
                for attempt in range(3):
                    response = client.models.generate_content(
                        model="gemini-3.1-flash-lite",
                        contents=current_prompt
                    )
                    generated_q = response.text.strip()
                    if not QuestionGeneratorTool.is_similar_question(generated_q, question_history):
                        return generated_q
                    else:
                        print(f"Attempt {attempt + 1}: Generated duplicate/similar question: '{generated_q}'. Retrying...")
                        # Append negative constraint to prompt
                        current_prompt += f"\n- Do NOT generate this question or anything similar to it: '{generated_q}'"
            except Exception as e:
                print(f"Error calling gemini-3.1-flash-lite for question generation: {e}. Falling back to RAG default.")

        # 4. Fallback Selection
        fallback_questions = {
            "INTRODUCTION": [
                f"Welcome {candidate_name}! Thank you for applying to our competitive bootcamp. To start our conversation, could you please share a brief summary of your background and what brings you here today?",
                f"Hello {candidate_name}! We are excited to have you. Could you introduce yourself and tell me why you want to learn building autonomous AI agents?"
            ],
            "BACKGROUND": [
                "Could you share a bit about your education or work background and how it led you to programming?",
                "What inspired you to explore the field of software engineering and autonomous agents?"
            ],
            "SKILLS": [
                "What programming languages or web frameworks have you worked with, and how would you describe your comfort level?",
                "Are you familiar with Python or JavaScript? How would you rate your level of expertise in these languages?",
                "What web dev technologies or databases do you have experience with?"
            ],
            "PROJECTS": [
                "Tell me about a project you built. What technologies did you use, and what challenges did you encounter?",
                "Could you describe a coding project you are proud of? What did you learn from building it?"
            ],
            "TECHNICAL": [
                "How would you explain the difference between client-side rendering (CSR) and server-side rendering (SSR)?",
                "How would you design a database schema to support a simple multi-user todo application?",
                "What are some key debugging strategies you use when your code doesn't work as expected?"
            ],
            "WRAP_UP": [
                "Thank you so much for your time today! That wraps up our interview. We will reach out to you shortly.",
                "Thank you for sharing your journey with me. This concludes the screening interview. We will reach out to you shortly."
            ],
        }

        phase_fallbacks = fallback_questions.get(phase.upper(), [])
        fallback_q = None
        for fb in phase_fallbacks:
            if not QuestionGeneratorTool.is_similar_question(fb, question_history):
                fallback_q = fb
                break
        if not fallback_q:
            fallback_q = "Could you tell me more about your experience in building software?"

        if unasked_rag_suggestions:
            return unasked_rag_suggestions[0]["question"]
        
        return fallback_q
