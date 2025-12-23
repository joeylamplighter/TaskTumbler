import React from "react";
import DuelTabLegacy from "./DuelTabLegacy";

/**
 * LegacyDuelTabAdapter
 * Purpose:
 * - Keeps v2 stable
 * - Wraps legacy Duel UI for safe integration
 * - Maps props between v2 and legacy components
 */
export default function LegacyDuelTabAdapter(props) {
  return <DuelTabLegacy {...props} />;
}

