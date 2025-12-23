import React from "react";
import SettingsTabLegacy from "./SettingsTabLegacy";

/**
 * LegacySettingsTabAdapter
 * Purpose:
 * - Keeps v2 stable
 * - Wraps legacy Settings UI for safe integration
 * - Maps props between v2 and legacy components
 */
export default function LegacySettingsTabAdapter(props) {
  return <SettingsTabLegacy {...props} />;
}
