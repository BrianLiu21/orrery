import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DAY_MS } from '../lib/kepler'

export type TaskStatus = 'active' | 'blocked' | 'done' | 'overdue'
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'
export type Priority = 1 | 2 | 3 | 4 | 5

export interface Task {
  id: string
  title: string
  notes: string
  /** ISO UTC. Always set for live tasks since v1.1 (the persist
   * migration heals legacy nulls); nullable only for old 'done' rows. */
  deadline: string | null
  priority: Priority
  project: string
  parentId: string | null
  recurrence: Recurrence
  /** 1–5; with priority this sets mass = priority × effort (DESIGN.md §5). */
  effort: number
  status: TaskStatus
  tags: string[]
  createdAt: string
  completedAt?: string
}

/** Durable record behind the galaxy (DESIGN.md §6) — must survive reloads. */
export interface CompletionRecord {
  id: string
  taskId: string
  title: string
  project: string
  /** priority × effort at completion time. */
  mass: number
  completedAt: string
}

export function taskMass(task: Pick<Task, 'priority' | 'effort'>): number {
  return task.priority * task.effort
}

export const RECURRENCE_DAYS: Record<Exclude<Recurrence, 'none'>, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  custom: 3,
}

interface TaskStoreState {
  tasks: Record<string, Task>
  completions: CompletionRecord[]
  addTask: (
    partial: Partial<Task> & Pick<Task, 'title'>,
  ) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  completeTask: (id: string, atMs: number) => void
  deleteTask: (id: string) => void
}

function makeTask(partial: Partial<Task> & Pick<Task, 'title'>): Task {
  return {
    id: crypto.randomUUID(),
    notes: '',
    deadline: null,
    priority: 3,
    project: 'inbox',
    parentId: null,
    recurrence: 'none',
    effort: 2,
    status: 'active',
    tags: [],
    createdAt: new Date().toISOString(),
    ...partial,
  }
}

/** First-run demo system: deadlines spread from in-the-zone to deep space. */
function seedTasks(): Record<string, Task> {
  const now = Date.now()
  const due = (days: number) => new Date(now + days * DAY_MS).toISOString()
  // Calm by default: a representative sky, not a showroom.
  const seeds: Array<Partial<Task> & Pick<Task, 'title'>> = [
    { title: 'Ship the quarterly report', deadline: due(0.6), priority: 5, effort: 3, project: 'ship' },
    { title: 'Review open pull requests', deadline: due(1.4), priority: 3, effort: 1, project: 'ship' },
    { title: 'Prepare demo for standup', deadline: due(3.2), priority: 4, effort: 2, project: 'ship' },
    { title: 'Draft experiment plan', deadline: due(11), priority: 4, effort: 4, project: 'research' },
    { title: 'Reproduce baseline results', deadline: due(20), priority: 3, effort: 5, project: 'research' },
    { title: 'Renew passport', deadline: due(38), priority: 4, effort: 1, project: 'life' },
    { title: 'File taxes', deadline: due(150), priority: 5, effort: 4, project: 'life' },
    { title: 'Write the year-in-review post', deadline: due(320), priority: 2, effort: 3, project: 'research' },
    // Recurring: an ordinary planet whose deadline advances on completion.
    { title: 'Weekly team sync notes', deadline: due(7), priority: 3, effort: 1, project: 'ship', recurrence: 'weekly' },
  ]
  const tasks: Record<string, Task> = {}
  let parent: Task | null = null
  for (const s of seeds) {
    const t = makeTask(s)
    tasks[t.id] = t
    if (t.title === 'Draft experiment plan') parent = t
  }
  // Subtasks become moons of their parent planet.
  if (parent) {
    for (const sub of [
      { title: 'List candidate datasets', priority: 2 as Priority, effort: 1 },
      { title: 'Sketch eval harness', priority: 3 as Priority, effort: 2 },
    ]) {
      const moon = makeTask({
        ...sub,
        deadline: parent.deadline,
        project: parent.project,
        parentId: parent.id,
      })
      tasks[moon.id] = moon
    }
  }
  return tasks
}

export const useTaskStore = create<TaskStoreState>()(
  persist(
    (set, get) => ({
      tasks: seedTasks(),
      completions: [],
      addTask: (partial) => {
        const task = makeTask(partial)
        set({ tasks: { ...get().tasks, [task.id]: task } })
        return task
      },
      updateTask: (id, patch) => {
        const existing = get().tasks[id]
        if (!existing) return
        set({ tasks: { ...get().tasks, [id]: { ...existing, ...patch } } })
      },
      completeTask: (id, atMs) => {
        const task = get().tasks[id]
        if (!task || task.status === 'done') return
        const completedAt = new Date(atMs).toISOString()
        const record: CompletionRecord = {
          id: crypto.randomUUID(),
          taskId: task.id,
          title: task.title,
          project: task.project,
          mass: taskMass(task),
          completedAt,
        }
        if (task.recurrence !== 'none' && task.deadline) {
          // A recurring task never dies — the occurrence completes and
          // the next one is already inbound: deadline advances one interval.
          const interval = RECURRENCE_DAYS[task.recurrence] * DAY_MS
          const next = Math.max(Date.parse(task.deadline) + interval, atMs + interval)
          set({
            tasks: {
              ...get().tasks,
              [id]: { ...task, deadline: new Date(next).toISOString(), status: 'active' },
            },
            completions: [...get().completions, record],
          })
          return
        }
        // Completing a planet completes its moons — subtasks can't outlive
        // their parent (they'd be invisible orphans in the store).
        const tasks = { ...get().tasks, [id]: { ...task, status: 'done' as const, completedAt } }
        const records = [record]
        for (const child of Object.values(tasks)) {
          if (child.parentId === id && child.status !== 'done') {
            tasks[child.id] = { ...child, status: 'done', completedAt }
            records.push({
              id: crypto.randomUUID(),
              taskId: child.id,
              title: child.title,
              project: child.project,
              mass: taskMass(child),
              completedAt,
            })
          }
        }
        set({ tasks, completions: [...get().completions, ...records] })
      },
      deleteTask: (id) => {
        const tasks = { ...get().tasks }
        delete tasks[id]
        set({ tasks })
      },
    }),
    {
      name: 'orrery-tasks-v1',
      version: 2,
      partialize: (s) => ({
        tasks: s.tasks,
        completions: s.completions,
      }),
      // v1.1 ambient cut: heal pre-cut saves so nothing becomes invisible
      // or unreachable — backlog tasks get a deadline a month out,
      // blocked tasks wake up, interrupt tags are stripped.
      migrate: (persisted) => {
        const state = persisted as {
          tasks?: Record<string, Task>
          completions?: CompletionRecord[]
        }
        const tasks = state.tasks ?? {}
        for (const t of Object.values(tasks)) {
          if (t.deadline === null && t.status !== 'done') {
            t.deadline = new Date(Date.now() + 30 * DAY_MS).toISOString()
          }
          if (t.status === 'blocked') t.status = 'active'
          if (t.tags?.includes('interrupt')) {
            t.tags = t.tags.filter((tag) => tag !== 'interrupt')
          }
        }
        return { tasks, completions: state.completions ?? [] }
      },
    },
  ),
)
