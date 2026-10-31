import { create } from 'zustand'
import type { MediaAsset, TimelineClip } from './types'

type EditorState = {
  assets: MediaAsset[]
  clips: TimelineClip[]
  selectedClipId: string | null
  playhead: number
  playing: boolean
  projectName: string
  addAssets: (items: MediaAsset[]) => void
  addClip: (clip: TimelineClip) => void
  updateClip: (id: string, patch: Partial<TimelineClip>) => void
  removeClip: (id: string) => void
  selectClip: (id: string | null) => void
  setPlayhead: (time: number) => void
  setPlaying: (playing: boolean) => void
  setProjectName: (name: string) => void
  autoArrange: () => void
}
const uid = () => Math.random().toString(36).slice(2, 10)
export const useEditor = create<EditorState>((set, get) => ({
  assets: [], clips: [], selectedClipId: null, playhead: 0, playing: false, projectName: 'Untitled project',
  addAssets: (items) => set(s => ({ assets: [...s.assets, ...items] })),
  addClip: (clip) => set(s => ({ clips: [...s.clips, clip] })),
  updateClip: (id, patch) => set(s => ({ clips: s.clips.map(c => c.id === id ? { ...c, ...patch } : c) })),
  removeClip: (id) => set(s => ({ clips: s.clips.filter(c => c.id !== id), selectedClipId: s.selectedClipId === id ? null : s.selectedClipId })),
  selectClip: (id) => set({ selectedClipId: id }),
  setPlayhead: (time) => set({ playhead: Math.max(0, time) }),
  setPlaying: (playing) => set({ playing }),
  setProjectName: (projectName) => set({ projectName }),
  autoArrange: () => {
    const { assets } = get()
    const visuals = assets.filter(a => a.kind === 'video' || a.kind === 'image')
    const voice = assets.find(a => a.kind === 'audio')
    if (!visuals.length) return
    const target = voice?.duration || visuals.reduce((sum, a) => sum + Math.min(a.duration || 5, 6), 0)
    const perClip = target / visuals.length
    const clips: TimelineClip[] = visuals.map((asset, i) => {
      const duration = asset.kind === 'image' ? Math.max(2, perClip) : Math.min(Math.max(2, perClip), asset.duration || perClip)
      return { id: uid(), assetId: asset.id, track: 'video', start: i * perClip, duration, sourceIn: 0, sourceOut: duration }
    })
    if (voice) clips.push({ id: uid(), assetId: voice.id, track: 'audio', start: 0, duration: voice.duration || target, sourceIn: 0, sourceOut: voice.duration || target })
    set({ clips, selectedClipId: null, playhead: 0 })
  }
}))
