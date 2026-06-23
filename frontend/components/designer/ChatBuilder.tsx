"use client";

import React, { useState, useRef, useEffect } from "react";
import { useBlueprintStore } from "../../store/useBlueprintStore";
import { MessageSquarePlus, AlertTriangle, Send } from "lucide-react";

interface ChatBuilderProps {
  triggerToast: (msg: string) => void;
}

export default function ChatBuilder({ triggerToast }: ChatBuilderProps) {
  const {
    messages,
    isLoading,
    clearChat,
    sendMessageToAI
  } = useBlueprintStore();

  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleChatSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const textToSend = customPrompt || chatInput;
    if (!textToSend.trim() || isLoading) return;

    if (!customPrompt) setChatInput("");

    await sendMessageToAI(textToSend);
    triggerToast("Blueprint synchronized!");
  };

  return (
    <section className="workspace-panel glass-panel">
      <div className="panel-header">
        <h2><MessageSquarePlus size={16} /> AI Chat Builder</h2>
        <button className="badge success" style={{ border: "none", cursor: "pointer" }} onClick={clearChat}>
          Clear History
        </button>
      </div>
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${m.role}`}>
              <div>
                {m.content.split("\n").map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
              {m.validationWarnings && m.validationWarnings.length > 0 && (
                <div style={{ marginTop: "8px", borderTop: "1px dashed rgba(245, 158, 11, 0.2)", paddingTop: "6px" }}>
                  <span style={{ color: "var(--warning)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}>
                    <AlertTriangle size={10} /> Warnings Added:
                  </span>
                  {m.validationWarnings.map((w, idx) => (
                    <div key={idx} style={{ color: "var(--text-secondary)", fontSize: "0.7rem", marginLeft: "12px" }}>• {w}</div>
                  ))}
                </div>
              )}
              {m.suggestedQuestions && m.suggestedQuestions.length > 0 && (
                <div className="suggestions-box">
                  {m.suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      className="suggestion-chip"
                      onClick={() => handleChatSubmit(undefined, q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="typing-indicator">
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
              <span className="typing-dot"></span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleChatSubmit} className="chat-input-area">
          <div className="chat-form">
            <input
              type="text"
              placeholder="Describe your blueprint changes..."
              className="chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="chat-send-btn" disabled={!chatInput.trim() || isLoading}>
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
