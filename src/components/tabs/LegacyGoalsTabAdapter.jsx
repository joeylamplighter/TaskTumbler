import React from "react";
import GoalsTabLegacy from "./GoalsTabLegacy";

/**
 * LegacyGoalsTabAdapter
 * Purpose:
 * - Keeps v2 stable
 * - Wraps legacy Goals UI for safe integration
 * - Maps props between v2 and legacy components
 */
export default function LegacyGoalsTabAdapter(props) {
  return <GoalsTabLegacy {...props} />;
}

