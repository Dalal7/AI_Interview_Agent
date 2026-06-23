import os
import csv
# pyrefly: ignore [missing-import]
import numpy as np
from typing import List, Dict, Any
# pyrefly: ignore [missing-import]
from google import genai
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

class RAGRetriever:
    """
    RAG utility to load question collections, rubrics, skills, and program
    requirements, and query them semantically (or via keyword fallback).
    """
    def __init__(self):
        self.rag_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "rag")
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"Error initializing Google GenAI Client in RAG: {e}")

        # In-memory storage for collections
        self.questions: List[Dict[str, str]] = []
        self.rubrics: List[Dict[str, str]] = []
        self.skills: List[Dict[str, str]] = []
        self.requirements: List[Dict[str, str]] = []

        # Load data
        self._load_csvs()
        
        # Embeddings cache
        self.question_embeddings = None
        self.rubric_embeddings = None
        self.skill_embeddings = None
        self.requirement_embeddings = None

        # Embeddings will be lazy-loaded on demand to speed up startup.
        pass

    def _load_csvs(self):
        # Load Question Bank
        q_path = os.path.join(self.rag_dir, "Question_Bank_Collection_v2.csv")
        if os.path.exists(q_path):
            with open(q_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self.questions = []
                for idx, row in enumerate(reader):
                    category = row.get("Category", "General")
                    question = row.get("Question", "")
                    
                    # Map Category to appropriate interview Phase
                    cat_upper = category.upper()
                    if "BACKGROUND" in cat_upper or "MOTIVATION" in cat_upper or "LEARNING" in cat_upper or "TEAMWORK" in cat_upper:
                        phase = "BACKGROUND"
                    elif "PROJECT" in cat_upper:
                        phase = "PROJECTS"
                    elif "PYTHON" in cat_upper or "GIT" in cat_upper:
                        phase = "SKILLS"
                    else:
                        # Machine Learning, NLP, Agentic AI, RAG, LLMs, Agentic AI Deep-Dive
                        phase = "TECHNICAL"
                        
                    self.questions.append({
                        "id": str(idx + 1),
                        "phase": phase,
                        "topic": category,
                        "difficulty": "Medium",
                        "question": question,
                        "keywords": category
                    })

        # Load Evaluation Rubric
        r_path = os.path.join(self.rag_dir, "evaluation_rubric.csv")
        if os.path.exists(r_path):
            with open(r_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self.rubrics = [row for row in reader]

        # Load Skill Definitions
        s_path = os.path.join(self.rag_dir, "skill_definitions.csv")
        if os.path.exists(s_path):
            with open(s_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self.skills = [row for row in reader]

        # Load Program Requirements
        req_path = os.path.join(self.rag_dir, "program_requirements.csv")
        if os.path.exists(req_path):
            with open(req_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self.requirements = [row for row in reader]

    def _get_embedding(self, text: str) -> List[float]:
        if not self.client:
            return []
        try:
            response = self.client.models.embed_content(
                model="gemini-embedding-001",
                contents=text
            )
            return response.embeddings[0].values
        except Exception:
            return []

    def _batch_embed(self, texts: List[str]) -> np.ndarray:
        if not self.client or not texts:
            return np.empty((0, 3072))
        try:
            response = self.client.models.embed_content(
                model="gemini-embedding-001",
                contents=texts
            )
            embeddings = [emb.values for emb in response.embeddings]
            return np.array(embeddings)
        except Exception as e:
            print(f"Error batch embedding: {e}. Falling back to individual embeddings.")
            embeddings = []
            for text in texts:
                emb = self._get_embedding(text)
                if emb:
                    embeddings.append(emb)
                else:
                    embeddings.append([0.0] * 3072)
            return np.array(embeddings)

    def _ensure_question_embeddings(self):
        if self.question_embeddings is None and self.client and self.questions:
            try:
                q_texts = [f"Phase: {q['phase']} | Topic: {q['topic']} | Question: {q['question']}" for q in self.questions]
                self.question_embeddings = self._batch_embed(q_texts)
            except Exception as e:
                print(f"Failed to generate semantic embeddings for questions: {e}")

    def _ensure_rubric_embeddings(self):
        if self.rubric_embeddings is None and self.client and self.rubrics:
            try:
                r_texts = [f"Category: {r['category']} | Score: {r['score']} | Description: {r['description']}" for r in self.rubrics]
                self.rubric_embeddings = self._batch_embed(r_texts)
            except Exception as e:
                print(f"Failed to generate semantic embeddings for rubrics: {e}")

    def _ensure_skill_embeddings(self):
        if self.skill_embeddings is None and self.client and self.skills:
            try:
                s_texts = [f"Skill: {s['skill']} | Keywords: {s['keywords']} | Description: {s['description']}" for s in self.skills]
                self.skill_embeddings = self._batch_embed(s_texts)
            except Exception as e:
                print(f"Failed to generate semantic embeddings for skills: {e}")

    def _ensure_requirement_embeddings(self):
        if self.requirement_embeddings is None and self.client and self.requirements:
            try:
                req_texts = [f"Requirement: {req['requirement']} | Type: {req['type']} | Description: {req['description']}" for req in self.requirements]
                self.requirement_embeddings = self._batch_embed(req_texts)
            except Exception as e:
                print(f"Failed to generate semantic embeddings for requirements: {e}")

    def _cosine_similarity(self, a, b):
        norm_a = np.linalg.norm(a, axis=1)
        norm_b = np.linalg.norm(b)
        if norm_b == 0 or np.any(norm_a == 0):
            return np.zeros(len(a))
        return np.dot(a, b) / (norm_a * norm_b)

    def retrieve_questions(self, query: str, phase: str = None, top_k: int = 2) -> List[Dict[str, str]]:
        """
        Retrieves matching questions based on query and phase.
        """
        import time
        from backend.services.system_evaluation_service import SystemEvaluationService
        start = time.time()
        try:
            self._ensure_question_embeddings()
            filtered_qs = self.questions
            filtered_embeddings = self.question_embeddings

            if phase:
                indices = [i for i, q in enumerate(self.questions) if q["phase"].upper() == phase.upper()]
                filtered_qs = [self.questions[i] for i in indices]
                if self.question_embeddings is not None and len(self.question_embeddings) > 0:
                    filtered_embeddings = self.question_embeddings[indices]

            if not filtered_qs:
                return []

            # If we have embeddings and client is active
            if self.client and filtered_embeddings is not None and len(filtered_embeddings) > 0:
                query_emb = self._get_embedding(query)
                if query_emb:
                    scores = self._cosine_similarity(filtered_embeddings, query_emb)
                    best_indices = np.argsort(scores)[::-1][:top_k]
                    return [filtered_qs[idx] for idx in best_indices]

            # Keyword Fallback
            keywords = query.lower().split()
            scored_qs = []
            for q in filtered_qs:
                score = sum(1 for kw in keywords if kw in q["question"].lower() or kw in q["topic"].lower() or kw in q["keywords"].lower())
                scored_qs.append((score, q))
            scored_qs.sort(key=lambda x: x[0], reverse=True)
            return [q[1] for q in scored_qs[:top_k]]
        finally:
            duration_ms = int((time.time() - start) * 1000)
            SystemEvaluationService.record_rag_retrieval(duration_ms)

    def retrieve_rubrics(self, query: str, category: str = None, top_k: int = 3) -> List[Dict[str, str]]:
        import time
        from backend.services.system_evaluation_service import SystemEvaluationService
        start = time.time()
        try:
            self._ensure_rubric_embeddings()
            filtered_rubrics = self.rubrics
            filtered_embeddings = self.rubric_embeddings

            if category:
                indices = [i for i, r in enumerate(self.rubrics) if category.lower() in r["category"].lower()]
                filtered_rubrics = [self.rubrics[i] for i in indices]
                if self.rubric_embeddings is not None and len(self.rubric_embeddings) > 0:
                    filtered_embeddings = self.rubric_embeddings[indices]

            if not filtered_rubrics:
                return []

            if self.client and filtered_embeddings is not None and len(filtered_embeddings) > 0:
                query_emb = self._get_embedding(query)
                if query_emb:
                    scores = self._cosine_similarity(filtered_embeddings, query_emb)
                    best_indices = np.argsort(scores)[::-1][:top_k]
                    return [filtered_rubrics[idx] for idx in best_indices]

            # Keyword Fallback
            keywords = query.lower().split()
            scored_r = []
            for r in filtered_rubrics:
                score = sum(1 for kw in keywords if kw in r["category"].lower() or kw in r["description"].lower())
                scored_r.append((score, r))
            scored_r.sort(key=lambda x: x[0], reverse=True)
            return [r[1] for r in scored_r[:top_k]]
        finally:
            duration_ms = int((time.time() - start) * 1000)
            SystemEvaluationService.record_rag_retrieval(duration_ms)

    def retrieve_skills(self, query: str, top_k: int = 3) -> List[Dict[str, str]]:
        import time
        from backend.services.system_evaluation_service import SystemEvaluationService
        start = time.time()
        try:
            self._ensure_skill_embeddings()
            if not self.skills:
                return []

            if self.client and self.skill_embeddings is not None and len(self.skill_embeddings) > 0:
                query_emb = self._get_embedding(query)
                if query_emb:
                    scores = self._cosine_similarity(self.skill_embeddings, query_emb)
                    best_indices = np.argsort(scores)[::-1][:top_k]
                    return [self.skills[idx] for idx in best_indices]

            # Keyword Fallback
            keywords = query.lower().split()
            scored_s = []
            for s in self.skills:
                score = sum(1 for kw in keywords if kw in s["skill"].lower() or kw in s["keywords"].lower() or kw in s["description"].lower())
                scored_s.append((score, s))
            scored_s.sort(key=lambda x: x[0], reverse=True)
            return [s[1] for s in scored_s[:top_k]]
        finally:
            duration_ms = int((time.time() - start) * 1000)
            SystemEvaluationService.record_rag_retrieval(duration_ms)

    def retrieve_requirements(self, query: str, top_k: int = 5) -> List[Dict[str, str]]:
        import time
        from backend.services.system_evaluation_service import SystemEvaluationService
        start = time.time()
        try:
            self._ensure_requirement_embeddings()
            if not self.requirements:
                return []

            if self.client and self.requirement_embeddings is not None and len(self.requirement_embeddings) > 0:
                query_emb = self._get_embedding(query)
                if query_emb:
                    scores = self._cosine_similarity(self.requirement_embeddings, query_emb)
                    best_indices = np.argsort(scores)[::-1][:top_k]
                    return [self.requirements[idx] for idx in best_indices]

            # Keyword Fallback
            keywords = query.lower().split()
            scored_req = []
            for req in self.requirements:
                score = sum(1 for kw in keywords if kw in req["requirement"].lower() or kw in req["description"].lower())
                scored_req.append((score, req))
            scored_req.sort(key=lambda x: x[0], reverse=True)
            return [req[1] for req in scored_req[:top_k]]
        finally:
            duration_ms = int((time.time() - start) * 1000)
            SystemEvaluationService.record_rag_retrieval(duration_ms)

# Instantiate global retriever
rag_retriever = RAGRetriever()
