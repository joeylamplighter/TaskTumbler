import React from "react";
import TimerTabLegacy from "./TimerTabLegacy";

/**
 * LegacyTimerTabAdapter
 * Purpose:
 * - Keeps v2 stable
 * - Wraps legacy Timer UI for safe integration
 * - Maps props between v2 and legacy components
 */
export default function LegacyTimerTabAdapter(props) {
  return <TimerTabLegacy {...props} />;
}

