import React from "react";
import SpinTabLegacy from "./SpinTabLegacy";

/**
 * LegacySpinTabAdapter
 * Purpose:
 * - Keeps v2 stable
 * - Wraps legacy Spin UI for safe integration
 * - Maps props between v2 and legacy components
 */
export default function LegacySpinTabAdapter(props) {
  return <SpinTabLegacy {...props} />;
}

