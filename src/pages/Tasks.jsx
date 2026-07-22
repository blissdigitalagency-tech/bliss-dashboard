import { useState } from 'react'

function Tasks() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Set up client onboarding checklist', done: false },
    { id: 2, text: 'Review July ad spend report', done: false },
  ])
  const [draft, setDraft] = useState('')

  function addTask(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    setTasks([...tasks, { id: Date.now(), text, done: false }])
    setDraft('')
  }

  function toggleTask(id) {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, done: !task.done } : task
      )
    )
  }

  function removeTask(id) {
    setTasks(tasks.filter((task) => task.id !== id))
  }

  return (
    <div className="page">
      <p className="page-intro">
        A simple task list stored in memory &mdash; it resets on page reload.
        Wire this up to a backend later if you need it to persist.
      </p>

      <form className="task-form" onSubmit={addTask}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a task..."
          className="task-input"
        />
        <button type="submit" className="btn-primary">
          Add
        </button>
      </form>

      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className="task-item">
            <label className="task-label">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task.id)}
              />
              <span className={task.done ? 'task-text task-done' : 'task-text'}>
                {task.text}
              </span>
            </label>
            <button
              type="button"
              className="task-remove"
              onClick={() => removeTask(task.id)}
              aria-label={`Remove ${task.text}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Tasks
