export type MediaKind = 'video' | 'image' | 'audio'
export type MediaAsset = {
  id: string
  name: string
  kind: MediaKind
  url: string
  duration: number
  file: File
  width?: number
  height?: number
}
export type TimelineClip = {
  id: string
  assetId: string
  track: 'video' | 'audio'
  start: number
  duration: number
  sourceIn: number
  sourceOut: number
}
