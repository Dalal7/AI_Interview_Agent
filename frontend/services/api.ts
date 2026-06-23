const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface StartInterviewResponse {
  candidate_id: string;
  question: string;
  debug_state?: any;
}

export interface MessageResponse {
  response: string;
  profile_completion_percentage: number;
  interview_phase: string;
  interview_status: string;
  debug_state?: any;
}

export interface LiveSessionCreateResponse {
  session_id: string;
  candidate_id: string;
  room_name: string;
  participant_identity: string;
  first_question: string;
  livekit_url?: string | null;
  debug_state?: any;
}

export interface LiveKitTokenResponse {
  token: string;
  livekit_url: string;
  room_name: string;
  participant_identity: string;
}

export interface CandidateProfile {
  id: string;
  candidate_name: string;
  email: string;
  education: any;
  background: any;
  skills: string[];
  projects: string[];
  strengths: string[];
  weaknesses: string[];
  overall_score: number;
  recommendation: string;
  email_sent: boolean;
  final_evaluation: string | null;
  created_at: string;
}

export interface CandidateSummary {
  id: string;
  candidate_name: string;
  email: string;
  overall_score: number;
  recommendation: string;
  email_sent: boolean;
  created_at: string;
  skills: string[];
}

export interface InterviewLog {
  id: number;
  question: string;
  answer: string | null;
  question_score: number;
  technical_score: number;
  communication_score: number;
  relevance_score: number;
  created_at: string;
}

export interface CandidateEvaluationResponse {
  profile: CandidateProfile;
  logs: InterviewLog[];
}

export const apiService = {
  async startInterview(name?: string, email?: string, orchestrationStrategy: string = "config", username?: string): Promise<StartInterviewResponse> {
    const response = await fetch(`${API_BASE_URL}/interview/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, orchestration_strategy: orchestrationStrategy, username }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Failed to start interview" }));
      throw new Error(err.detail || "Failed to start interview");
    }
    return response.json();
  },

  async sendMessage(candidateId: string, message: string): Promise<MessageResponse> {
    const response = await fetch(`${API_BASE_URL}/interview/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidate_id: candidateId, message }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Failed to send message" }));
      throw new Error(err.detail || "Failed to send message");
    }
    return response.json();
  },

  async createLiveSession(payload: {
    name?: string;
    email?: string;
    username?: string;
    voice?: string;
    conversation_mode?: string;
    orchestration_strategy?: string;
  }): Promise<LiveSessionCreateResponse> {
    const response = await fetch(`${API_BASE_URL}/live/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Failed to create live session" }));
      throw new Error(err.detail || "Failed to create live session");
    }
    return response.json();
  },

  async createLiveKitToken(roomName: string, participantIdentity: string, participantName?: string): Promise<LiveKitTokenResponse> {
    const response = await fetch(`${API_BASE_URL}/live/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_name: roomName,
        participant_identity: participantIdentity,
        participant_name: participantName,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Failed to create LiveKit token" }));
      throw new Error(err.detail || "Failed to create LiveKit token");
    }
    return response.json();
  },

  async submitVoiceTurn(candidateId: string, transcript: string, roomName?: string): Promise<MessageResponse> {
    const response = await fetch(`${API_BASE_URL}/live/voice-turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate_id: candidateId,
        transcript,
        room_name: roomName,
        is_final: true,
        source: "typed_voice_fallback",
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Failed to submit transcript" }));
      throw new Error(err.detail || "Failed to submit transcript");
    }
    return response.json();
  },

  async endLiveSession(roomName: string): Promise<{ status: string; room_name: string }> {
    const response = await fetch(`${API_BASE_URL}/live/session/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_name: roomName }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Failed to end live session" }));
      throw new Error(err.detail || "Failed to end live session");
    }
    return response.json();
  },

  async getProfile(candidateId: string): Promise<CandidateProfile> {
    const response = await fetch(`${API_BASE_URL}/interview/profile/${candidateId}`);
    if (!response.ok) throw new Error("Failed to load candidate profile");
    return response.json();
  },

  async getLiveSessionDetails(roomName: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/live/session/${roomName}`);
    if (!response.ok) throw new Error("Failed to load live session details");
    return response.json();
  },

  async getCandidates(): Promise<CandidateSummary[]> {
    const response = await fetch(`${API_BASE_URL}/dashboard/candidates`);
    if (!response.ok) throw new Error("Failed to load candidates");
    return response.json();
  },

  async getCandidateEvaluation(candidateId: string): Promise<CandidateEvaluationResponse> {
    const response = await fetch(`${API_BASE_URL}/dashboard/candidate/${candidateId}`);
    if (!response.ok) throw new Error("Failed to load candidate evaluation");
    return response.json();
  },

  async getInterviewHistory(username: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/interview/history/${username}`);
    if (!response.ok) throw new Error("Failed to load interview history");
    return response.json();
  },

  async updateCandidateStatus(candidateId: string, recommendation: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/dashboard/candidate/${candidateId}/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendation }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Failed to update status" }));
      throw new Error(err.detail || "Failed to update status");
    }
    return response.json();
  },

  async sendResultsEmail(candidateId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/dashboard/candidate/${candidateId}/send-email`, {
      method: "POST",
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Failed to send email" }));
      throw new Error(err.detail || "Failed to send email");
    }
    return response.json();
  },
};
