// Helper to ensure task has all fields
export const completeTask = (task, locationMap) => {
  const locCoords = task.locationIds?.[0] && locationMap[task.locationIds[0]] 
    ? { lat: locationMap[task.locationIds[0]].lat, lon: locationMap[task.locationIds[0]].lon }
    : null;
  
  return {
    id: task.id,
    title: task.title,
    category: task.category || 'Work',
    subtype: task.subtype || null,
    priority: task.priority || 'Medium',
    estimatedTime: task.estimatedTime || '',
    estimatedTimeUnit: task.estimatedTimeUnit || 'min',
    people: Array.isArray(task.people) ? task.people : [],
    location: task.location || '',
    locationIds: Array.isArray(task.locationIds) ? task.locationIds : [],
    locationCoords: locCoords,
    completed: Boolean(task.completed),
    createdAt: task.createdAt || new Date().toISOString(),
    completedAt: task.completedAt || null,
    dueDate: task.dueDate || '',
    dueTime: task.dueTime || '',
    startDate: task.startDate || '',
    startTime: task.startTime || '',
    tags: Array.isArray(task.tags) ? task.tags : [],
    weight: task.weight || 10,
    actualTime: task.actualTime || 0,
    percentComplete: task.percentComplete || 0,
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
    recurring: task.recurring || 'None',
    reminderMode: task.reminderMode || 'none',
    reminderAnchor: task.reminderAnchor || 'due',
    reminderOffsetValue: task.reminderOffsetValue || 1,
    reminderOffsetUnit: task.reminderOffsetUnit || 'hours',
    blockedBy: Array.isArray(task.blockedBy) ? task.blockedBy : [],
    goalId: task.goalId || null,
    excludeFromTumbler: Boolean(task.excludeFromTumbler),
    lastModified: task.lastModified || task.createdAt || new Date().toISOString()
  };
};
