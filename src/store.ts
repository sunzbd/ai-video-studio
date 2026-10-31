import { create } from 'zustand'
import type { MediaAsset, TimelineClip } from './types'

type EditorState = {
  assets: MediaAsset[]
  clips: TimelineClip[]
  selectedClipId: string | null
  playhead: number
  playing: boolean
  projectName: string
  addAssets: (assets: MediaAsset[]) => void
  addClip: (clip: TimelineClip) => void
  updateClip: (id: string, patch: Partial<TimelineClip>) => void
  removeClip: (id: string) => void
  selectClip: (id: string | null) => void
  setPlayhead: (time: number) => void
  setPlaying: (playing: boolean) => void
  setProjectName: (name: string) => void
  autoArrange: () => void
}

export const useEditor = create<EditorState>((set, get) => ({
  assets: [], clips: [], selectedClipId: null, playhead: 0, playing: false,
  projectName: 'Untitled Project',
  addAssets: (assets) => set((s) => ({ assets: [...s.assets, ...assets] })),
  addClip: (clip) => set((s) => ({ clips: [...s.clips, clip] })),
  updateClip: (id, patch) => set((s) => ({ clips: s.clips.map(c => c.id === id ? { ...c, ...patch } : c) })),
  removeClip: (id) => set((s) => ({ clips: s.clips.filter(c => c.id !== id), selectedClipId: s.selectedClipId === id ? null : s.selectedClipId })),
  selectClip: (id) => set({ selectedClipId: id }),
  setPlayhead: (time) => set({ playhead: Math.max(0, time) }),
  setPlaying: (playing) => set({ playing }),
  setProjectName: (projectName) => set({ projectName }),
  autoArrange: () => {
    const { assets } = get()
    const visuals = assets.filter(a => a.kind !== 'audio')
    const audio = assets.find(a => a.kind === 'audio')
    let cursor = 0
    const clips: TimelineClip[] = visuals.map(asset => {
      const duration = asset.kind === 'image' ? 5 : Math.max(1, asset.duration || 5)
      const clip: TimelineClip = { id: Math.random().toString(36).slice(2, 10), assetId: asset.id, track: 'video', start: cursor, duration, sourceIn: 0, sourceOut: duration }
      cursor += duration
      return clip
    })
    if (audio) clips.push({ id: Math.random().toString(36).slice(2, 10), assetId: audio.id, track: 'audio', start: 0, duration: Math.max(1, audio.duration || cursor), sourceIn: 0, sourceOut: Math.max(1, audio.duration || cursor) })
    set({ clips, selectedClipId: null, playhead: 0 })
  }
}))
