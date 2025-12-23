import React from "react";
import IdeasTabLegacy from "./IdeasTabLegacy";

/**
 * LegacyIdeasTabAdapter
 * Purpose:
 * - Keeps v2 stable
 * - Wraps legacy Ideas UI for safe integration
 * - Maps props between v2 and legacy components
 */
export default function LegacyIdeasTabAdapter(props) {
  return <IdeasTabLegacy {...props} />;
}

