import React from "react";
import StatsTabLegacy from "./StatsTabLegacy";

/**
 * LegacyStatsTabAdapter
 * Purpose:
 * - Keeps v2 stable
 * - Wraps legacy Stats UI for safe integration
 * - Maps props between v2 and legacy components
 */
export default function LegacyStatsTabAdapter(props) {
  return <StatsTabLegacy {...props} />;
}

