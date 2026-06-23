"use client";

import React, { useState } from "react";
import { useBlueprintStore } from "../../../store/useBlueprintStore";
import { Trash2, Plus } from "lucide-react";

export default function SkillsForm() {
  const { blueprint, updateField } = useBlueprintStore();

  const [tempSkillReq, setTempSkillReq] = useState("");
  const [tempSkillPref, setTempSkillPref] = useState("");
  const [tempSkillBonus, setTempSkillBonus] = useState("");

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
      {/* Required Skills */}
      <div className="form-group">
        <label className="form-label">Required Skills</label>
        <div className="array-item-list">
          {(blueprint.skills?.required || []).map((skill, idx) => (
            <div key={idx} className="array-row">
              <input
                type="text"
                className="form-input"
                value={skill}
                onChange={(e) => {
                  const next = [...(blueprint.skills?.required || [])];
                  next[idx] = e.target.value;
                  updateField("skills.required", next);
                }}
              />
              <button type="button" className="icon-btn" onClick={() => handleRemoveItem("skills.required", idx)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="array-row" style={{ marginTop: "4px" }}>
            <input
              type="text"
              placeholder="Add required skill..."
              className="form-input"
              value={tempSkillReq}
              onChange={(e) => setTempSkillReq(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem("skills.required", tempSkillReq, setTempSkillReq)}
            />
            <button 
              type="button" 
              className="icon-btn primary"
              onClick={() => handleAddItem("skills.required", tempSkillReq, setTempSkillReq)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Preferred Skills */}
      <div className="form-group">
        <label className="form-label">Preferred Skills</label>
        <div className="array-item-list">
          {(blueprint.skills?.preferred || []).map((skill, idx) => (
            <div key={idx} className="array-row">
              <input
                type="text"
                className="form-input"
                value={skill}
                onChange={(e) => {
                  const next = [...(blueprint.skills?.preferred || [])];
                  next[idx] = e.target.value;
                  updateField("skills.preferred", next);
                }}
              />
              <button type="button" className="icon-btn" onClick={() => handleRemoveItem("skills.preferred", idx)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="array-row" style={{ marginTop: "4px" }}>
            <input
              type="text"
              placeholder="Add preferred skill..."
              className="form-input"
              value={tempSkillPref}
              onChange={(e) => setTempSkillPref(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem("skills.preferred", tempSkillPref, setTempSkillPref)}
            />
            <button 
              type="button" 
              className="icon-btn primary"
              onClick={() => handleAddItem("skills.preferred", tempSkillPref, setTempSkillPref)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Bonus Skills */}
      <div className="form-group">
        <label className="form-label">Bonus Skills</label>
        <div className="array-item-list">
          {(blueprint.skills?.bonus || []).map((skill, idx) => (
            <div key={idx} className="array-row">
              <input
                type="text"
                className="form-input"
                value={skill}
                onChange={(e) => {
                  const next = [...(blueprint.skills?.bonus || [])];
                  next[idx] = e.target.value;
                  updateField("skills.bonus", next);
                }}
              />
              <button type="button" className="icon-btn" onClick={() => handleRemoveItem("skills.bonus", idx)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="array-row" style={{ marginTop: "4px" }}>
            <input
              type="text"
              placeholder="Add bonus/soft skill..."
              className="form-input"
              value={tempSkillBonus}
              onChange={(e) => setTempSkillBonus(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem("skills.bonus", tempSkillBonus, setTempSkillBonus)}
            />
            <button 
              type="button" 
              className="icon-btn primary"
              onClick={() => handleAddItem("skills.bonus", tempSkillBonus, setTempSkillBonus)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
