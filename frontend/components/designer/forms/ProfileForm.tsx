"use client";

import React, { useState } from "react";
import { useBlueprintStore } from "../../../store/useBlueprintStore";
import { Trash2, Plus } from "lucide-react";

export default function ProfileForm() {
  const { blueprint, updateField } = useBlueprintStore();

  const [tempAudience, setTempAudience] = useState("");
  const [tempRequirement, setTempRequirement] = useState("");

  const handleAddItem = (path: string, item: string, setItemState: React.Dispatch<React.SetStateAction<string>>) => {
    if (!item.trim()) return;
    const currentArray = path.split(".").reduce((o, i) => o?.[i], blueprint as any) || [];
    updateField(path, [...currentArray, item.trim()]);
    setItemState("");
  };

  const handleRemoveItem = (path: string, index: number) => {
    const currentArray = path.split(".").reduce((o, i) => o?.[i], blueprint as any) || [];
    const nextArray = [...currentArray];
    nextArray.splice(index, 1);
    updateField(path, nextArray);
  };

  return (
    <div className="form-section">
      <div className="form-group">
        <label className="form-label">Experience Level</label>
        <input
          type="text"
          className="form-input"
          value={blueprint.candidate_profile?.experience_level ?? ""}
          onChange={(e) => updateField("candidate_profile.experience_level", e.target.value)}
          placeholder="e.g. Junior Developer, Senior Manager"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Target Audience</label>
        <div className="array-item-list">
          {(blueprint.candidate_profile?.target_audience || []).map((ta, idx) => (
            <div key={idx} className="array-row">
              <input
                type="text"
                className="form-input"
                value={ta}
                onChange={(e) => {
                  const next = [...(blueprint.candidate_profile?.target_audience || [])];
                  next[idx] = e.target.value;
                  updateField("candidate_profile.target_audience", next);
                }}
              />
              <button type="button" className="icon-btn" onClick={() => handleRemoveItem("candidate_profile.target_audience", idx)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="array-row" style={{ marginTop: "4px" }}>
            <input
              type="text"
              placeholder="Add candidate target segment..."
              className="form-input"
              value={tempAudience}
              onChange={(e) => setTempAudience(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem("candidate_profile.target_audience", tempAudience, setTempAudience)}
            />
            <button 
              type="button" 
              className="icon-btn primary"
              onClick={() => handleAddItem("candidate_profile.target_audience", tempAudience, setTempAudience)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Minimum Requirements</label>
        <div className="array-item-list">
          {(blueprint.candidate_profile?.minimum_requirements || []).map((req, idx) => (
            <div key={idx} className="array-row">
              <input
                type="text"
                className="form-input"
                value={req}
                onChange={(e) => {
                  const next = [...(blueprint.candidate_profile?.minimum_requirements || [])];
                  next[idx] = e.target.value;
                  updateField("candidate_profile.minimum_requirements", next);
                }}
              />
              <button type="button" className="icon-btn" onClick={() => handleRemoveItem("candidate_profile.minimum_requirements", idx)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="array-row" style={{ marginTop: "4px" }}>
            <input
              type="text"
              placeholder="Add core criteria..."
              className="form-input"
              value={tempRequirement}
              onChange={(e) => setTempRequirement(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem("candidate_profile.minimum_requirements", tempRequirement, setTempRequirement)}
            />
            <button 
              type="button" 
              className="icon-btn primary"
              onClick={() => handleAddItem("candidate_profile.minimum_requirements", tempRequirement, setTempRequirement)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
