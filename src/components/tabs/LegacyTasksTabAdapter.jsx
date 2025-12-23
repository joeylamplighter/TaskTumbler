import React from "react";
import TasksTabLegacy from "./TasksTabLegacy";

/**
 * LegacyTasksTabAdapter
 * Purpose:
 * - Keeps v2 stable
 * - Wraps legacy Tasks UI for safe integration
 * - Maps props between v2 and legacy components
 */
export default function LegacyTasksTabAdapter(props) {
  return <TasksTabLegacy {...props} />;
}

