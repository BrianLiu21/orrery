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

export interface GalaxyPick {
  title: string
  project: string
  completedAt: string
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
  /** System (default) or zoomed way out over the legacy galaxy. */
  viewMode: 'system' | 'galaxy'
  /** Clicked star in the galaxy — a memory of finished work. */
  galaxyPick: GalaxyPick | null
  select: (id: string | null) => void
  setHovered: (id: string | null) => void
  startDrag: (id: string) => void
  setDragPreview: (days: number | null) => void
  endDrag: () => void
  pushDeath: (d: DeathEvent) => void
  clearDeath: (taskId: string) => void
  setCreateOpen: (open: boolean) => void
  setProjectFilter: (project: string | null) => void
  setViewMode: (mode: 'system' | 'galaxy') => void
  setGalaxyPick: (pick: GalaxyPick | null) => void
}

export const useUiStore = create<UiState>()((set, get) => ({
  selectedTaskId: null,
  hoveredTaskId: null,
  draggingTaskId: null,
  dragPreviewDays: null,
  deaths: [],
  createOpen: false,
  projectFilter: null,
  viewMode: 'system',
  galaxyPick: null,
  // Selecting a task always returns you to the system — the work is here.
  select: (id) => set(id ? { selectedTaskId: id, viewMode: 'system' } : { selectedTaskId: id }),
  setHovered: (id) => set({ hoveredTaskId: id }),
  startDrag: (id) => set({ draggingTaskId: id }),
  setDragPreview: (days) => set({ dragPreviewDays: days }),
  endDrag: () => set({ draggingTaskId: null, dragPreviewDays: null }),
  pushDeath: (d) => set({ deaths: [...get().deaths, d] }),
  clearDeath: (taskId) =>
    set({ deaths: get().deaths.filter((d) => d.taskId !== taskId) }),
  setCreateOpen: (open) => set({ createOpen: open }),
  setProjectFilter: (project) => set({ projectFilter: project }),
  setViewMode: (mode) =>
    set(mode === 'galaxy' ? { viewMode: mode, selectedTaskId: null } : { viewMode: mode, galaxyPick: null }),
  setGalaxyPick: (pick) => set({ galaxyPick: pick }),
}))
