"use client";

import React from "react";
import { useBlueprintStore } from "../../../store/useBlueprintStore";

export default function AgentForm() {
  const { blueprint, updateField } = useBlueprintStore();

  return (
    <div className="form-section">
      <div className="form-group">
        <label className="form-label">Voice Agent Tone</label>
        <select
          className="form-select"
          value={blueprint.agent_configuration?.tone ?? "friendly"}
          onChange={(e) => updateField("agent_configuration.tone", e.target.value)}
        >
          <option value="friendly">Friendly & Collaborative</option>
          <option value="professional">Professional</option>
          <option value="formal">Formal</option>
          <option value="encouraging">Encouraging & Supporting</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Verbosity Level</label>
        <select
          className="form-select"
          value={blueprint.agent_configuration?.verbosity ?? "medium"}
          onChange={(e) => updateField("agent_configuration.verbosity", e.target.value)}
        >
          <option value="low">Low (Concise questions)</option>
          <option value="medium">Medium (Standard explanations)</option>
          <option value="high">High (Deep context guides)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Primary Interview Language</label>
        <input
          type="text"
          className="form-input"
          value={blueprint.agent_configuration?.language ?? "English"}
          onChange={(e) => updateField("agent_configuration.language", e.target.value)}
          placeholder="e.g. English, Spanish, German"
        />
      </div>
    </div>
  );
}
