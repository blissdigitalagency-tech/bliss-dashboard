export function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isOverdue(task, today = todayKey()) {
  return task.stage !== 'done' && Boolean(task.dueDate) && task.dueDate < today
}

// Only judged on tasks that finished and had a due date to meet.
export function wasOnTime(task) {
  return task.stage === 'done' && Boolean(task.dueDate) && Boolean(task.completedDate) && task.completedDate <= task.dueDate
}

export function isJudgedForTimeliness(task) {
  return task.stage === 'done' && Boolean(task.dueDate) && Boolean(task.completedDate)
}
