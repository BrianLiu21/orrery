import { create } from 'zustand'

export interface DeathEvent {
  taskId: string
  /** priority × effort at completion — selects the death (DESIGN.md §5). */
  mass: number
  /** World position where the planet died. */
  position: [number, number, number]
  accent: string
  startedAt: number
}

interface UiState {
  selectedTaskId: string | null
  hoveredTaskId: string | null
  draggingTaskId: string | null
  /** Live deadline preview (days until due) while dragging. */
  dragPreviewDays: number | null
  deaths: DeathEvent[]
  createOpen: boolean
  /** Project isolation — null = show all. */
  projectFilter: string | null
  select: (id: string | null) => void
  setHovered: (id: string | null) => void
  startDrag: (id: string) => void
  setDragPreview: (days: number | null) => void
  endDrag: () => void
  pushDeath: (d: DeathEvent) => void
  clearDeath: (taskId: string) => void
  setCreateOpen: (open: boolean) => void
  setProjectFilter: (project: string | null) => void
}

export const useUiStore = create<UiState>()((set, get) => ({
  selectedTaskId: null,
  hoveredTaskId: null,
  draggingTaskId: null,
  dragPreviewDays: null,
  deaths: [],
  createOpen: false,
  projectFilter: null,
  select: (id) => set({ selectedTaskId: id }),
  setHovered: (id) => set({ hoveredTaskId: id }),
  startDrag: (id) => set({ draggingTaskId: id }),
  setDragPreview: (days) => set({ dragPreviewDays: days }),
  endDrag: () => set({ draggingTaskId: null, dragPreviewDays: null }),
  pushDeath: (d) => set({ deaths: [...get().deaths, d] }),
  clearDeath: (taskId) =>
    set({ deaths: get().deaths.filter((d) => d.taskId !== taskId) }),
  setCreateOpen: (open) => set({ createOpen: open }),
  setProjectFilter: (project) => set({ projectFilter: project }),
}))
