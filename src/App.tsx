import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, AudioLines, Captions, ChevronDown, CloudUpload, Download,
  Film, FolderOpen, Image as ImageIcon, Layers, Music2, Pause, Play, Plus, Scissors,
  Settings2, Sparkles, Split, Trash2, Upload, WandSparkles, ZoomIn, ZoomOut
} from 'lucide-react'
import { useEditor } from './store'
import type { MediaAsset, TimelineClip } from './types'

const fmt = (n: number) => {
  const s = Math.max(0, Math.floor(n || 0))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const id = () => Math.random().toString(36).slice(2, 10)

export default function App() {
  const {
    assets, clips, selectedClipId, playhead, playing, projectName,
    addAssets, updateClip, removeClip, selectClip, setPlayhead, setPlaying, autoArrange, setProjectName
  } = useEditor()
  const [tab, setTab] = useState<'media'|'audio'|'text'|'ai'>('media')
  const [zoom, setZoom] = useState(42)
  const [notice, setNotice] = useState('Import media to start editing')
  const [exporting, setExporting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const selected = clips.find(c => c.id === selectedClipId)
  const selectedAsset = assets.find(a => a.id === selected?.assetId)
  const totalDuration = Math.max(30, ...clips.map(c => c.start + c.duration), 30)
  const activeVisual = useMemo(() => clips
    .filter(c => c.track === 'video' && playhead >= c.start && playhead < c.start + c.duration)
    .sort((a,b) => b.start-a.start)[0], [clips, playhead])
  const activeAsset = assets.find(a => a.id === activeVisual?.assetId)

  useEffect(() => {
    if (!videoRef.current || !activeAsset || activeAsset.kind !== 'video') return
    const el = videoRef.current
    const localTime = Math.max(0, activeVisual ? activeVisual.sourceIn + playhead - activeVisual.start : 0)
    if (el.src !== activeAsset.url) el.src = activeAsset.url
    const sync = () => { if (Math.abs(el.currentTime - localTime) > 0.35) el.currentTime = Math.min(localTime, el.duration || localTime) }
    if (el.readyState >= 1) sync()
    else el.onloadedmetadata = sync
    if (playing) el.play().catch(() => setPlaying(false))
    else el.pause()
  }, [activeAsset, activeVisual, playhead, playing, setPlaying])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const next = useEditor.getState().playhead + 0.1
      if (next >= totalDuration) { setPlaying(false); setPlayhead(0) }
      else setPlayhead(next)
    }, 100)
    return () => window.clearInterval(timer)
  }, [playing, totalDuration, setPlayhead, setPlaying])

  const ingest = async (files: FileList | null) => {
    if (!files) return
    const incoming: MediaAsset[] = []
    for (const file of Array.from(files)) {
      const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : null
      if (!kind) continue
      const url = URL.createObjectURL(file)
      let duration = kind === 'image' ? 5 : 0
      if (kind !== 'image') {
        duration = await new Promise<number>(resolve => {
          const media = document.createElement(kind === 'video' ? 'video' : 'audio')
          media.preload = 'metadata'
          media.src = url
          media.onloadedmetadata = () => resolve(Number.isFinite(media.duration) ? media.duration : 0)
          media.onerror = () => resolve(0)
        })
      }
      incoming.push({ id: id(), name: file.name, kind, url, duration, file })
    }
    addAssets(incoming)
    setNotice(`${incoming.length} asset${incoming.length === 1 ? '' : 's'} imported`)
  }
  const addToTimeline = (asset: MediaAsset) => {
    const track = asset.kind === 'audio' ? 'audio' : 'video'
    const start = track === 'audio' ? 0 : Math.max(0, ...clips.filter(c => c.track === 'video').map(c => c.start + c.duration))
    const duration = asset.kind === 'image' ? 5 : asset.duration || 5
    const clip: TimelineClip = { id: id(), assetId: asset.id, track, start, duration, sourceIn: 0, sourceOut: duration }
    useEditor.getState().addClip(clip)
    selectClip(clip.id)
    setNotice(`${asset.name} added to timeline`)
  }
  const handleAutoEdit = () => {
    autoArrange()
    setNotice('Sequence assembled. Review and adjust the clips on the timeline.')
  }
  const splitSelected = () => {
    if (!selected || playhead <= selected.start + 0.1 || playhead >= selected.start + selected.duration - 0.1) return
    const leftDuration = playhead - selected.start
    const rightDuration = selected.duration - leftDuration
    updateClip(selected.id, { duration: leftDuration, sourceOut: selected.sourceIn + leftDuration })
    const right: TimelineClip = { ...selected, id: id(), start: playhead, duration: rightDuration, sourceIn: selected.sourceIn + leftDuration }
    useEditor.getState().addClip(right)
    setNotice('Clip split at playhead')
  }
  const exportDraft = async () => {
    setExporting(true)
    setNotice('Preparing project data for export…')
    const data = {
      projectName, exportedAt: new Date().toISOString(),
      note: 'This is an editable project manifest. MP4 rendering is not connected in this first deliverable.',
      assets: assets.map(a => ({ id: a.id, name: a.name, kind: a.kind, duration: a.duration })),
      clips
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'ai-video-studio-project.json'; a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
    setNotice('Project manifest downloaded')
  }
  const clipStyle = (clip: TimelineClip) => ({
    left: `${clip.start * zoom}px`,
    width: `${Math.max(38, clip.duration * zoom)}px`
  })
  const playPause = () => setPlaying(!playing)

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><WandSparkles size={18}/></div><span>AI <b>VIDEO STUDIO</b></span></div>
      <div className="project-name"><input value={projectName} onChange={e=>setProjectName(e.target.value)} aria-label="Project name"/><ChevronDown size={14}/></div>
      <div className="top-actions">
        <span className="saved"><span className="dot"/> Local project</span>
        <button className="icon-btn" title="Settings"><Settings2 size={17}/></button>
        <button className="export-btn" onClick={exportDraft} disabled={exporting}><Download size={15}/>{exporting ? 'Preparing…' : 'Export project'}</button>
      </div>
    </header>

    <main className="workspace">
      <aside className="left-rail">
        <button className={tab==='media'?'rail-item active':'rail-item'} onClick={()=>setTab('media')}><Film/><span>Media</span></button>
        <button className={tab==='audio'?'rail-item active':'rail-item'} onClick={()=>setTab('audio')}><Music2/><span>Audio</span></button>
        <button className={tab==='text'?'rail-item active':'rail-item'} onClick={()=>setTab('text')}><Captions/><span>Text</span></button>
        <button className={tab==='ai'?'rail-item active':'rail-item'} onClick={()=>setTab('ai')}><Sparkles/><span>AI Studio</span></button>
        <div className="rail-bottom"><button className="rail-item"><FolderOpen/><span>Projects</span></button></div>
      </aside>

      <section className="media-panel">
        <div className="panel-heading"><div><span className="eyebrow">WORKSPACE</span><h2>{tab==='media'?'Media library':tab==='audio'?'Audio assets':tab==='text'?'Text & captions':'AI tools'}</h2></div><button className="small-icon" onClick={()=>fileRef.current?.click()}><Plus size={16}/></button></div>
        {tab==='media' || tab==='audio' ? <>
          <button className="upload-zone" onClick={()=>fileRef.current?.click()}>
            <CloudUpload size={25}/><b>Import media</b><span>Videos, images and audio</span>
          </button>
          <div className="asset-count">{assets.filter(a=>tab==='media'?a.kind!=='audio':a.kind==='audio').length} ASSETS</div>
          <div className="asset-list">
            {assets.filter(a=>tab==='media'?a.kind!=='audio':a.kind==='audio').map(asset=><div className="asset-row" key={asset.id}>
              <div className="asset-thumb">{asset.kind==='video'?<Film size={18}/>:asset.kind==='image'?<ImageIcon size={18}/>:<AudioLines size={18}/>}</div>
              <div className="asset-meta"><b title={asset.name}>{asset.name}</b><span>{asset.kind.toUpperCase()} · {asset.kind==='image'?'Still image':fmt(asset.duration)}</span></div>
              <button className="add-asset" title="Add to timeline" onClick={()=>addToTimeline(asset)}><Plus size={15}/></button>
            </div>)}
            {!assets.length && <div className="empty-small">Your imported media will appear here.</div>}
          </div>
          <input ref={fileRef} hidden type="file" multiple accept="video/*,image/*,audio/*" onChange={e=>{ingest(e.target.files);e.currentTarget.value=''}}/>
        </> : tab==='ai' ? <div className="tool-list">
          <div className="ai-card"><div className="ai-icon"><Sparkles/></div><b>Auto Edit</b><p>Arrange uploaded visuals into a first-pass sequence. Voiceover duration is used as the target length.</p><button className="primary-wide" onClick={handleAutoEdit}>Generate sequence <Sparkles size={15}/></button></div>
          <div className="tool-note"><Activity size={16}/><span>Semantic scene matching, transcription and AI ranking will connect in the next backend milestone.</span></div>
        </div> : <div className="tool-list"><div className="tool-note"><Captions size={17}/><span>Caption and title tools are planned for the next editing milestone.</span></div></div>}
      </section>

      <section className="center-stage">
        <div className="stage-toolbar"><span>PREVIEW</span><div><span className="resolution">FIT</span><span className="resolution">16:9</span><span className="resolution">1080p</span></div></div>
        <div className="preview-wrap">
          <div className="preview-canvas">
            {activeAsset?.kind==='video' ? <video ref={videoRef} className="preview-media" playsInline muted/> :
             activeAsset?.kind==='image' ? <img className="preview-media" src={activeAsset.url} /> :
             <div className="preview-empty"><div className="preview-logo"><WandSparkles size={30}/></div><h2>Your story starts here</h2><p>Import footage, add a voiceover, then use AI Auto Edit.</p><button onClick={()=>fileRef.current?.click()}><Upload size={15}/> Import media</button></div>}
            <div className="preview-time">{fmt(playhead)} <span>/</span> {fmt(totalDuration)}</div>
          </div>
        </div>
        <div className="transport">
          <div className="transport-left"><button className="transport-btn" onClick={()=>setPlayhead(0)}>↤</button><button className="play-btn" onClick={playPause}>{playing?<Pause size={17}/>:<Play size={17} fill="currentColor"/>}</button><button className="transport-btn" onClick={()=>setPlayhead(Math.min(totalDuration,playhead+5))}>↦</button></div>
          <div className="transport-time">{fmt(playhead)} <span>/ {fmt(totalDuration)}</span></div>
          <div className="transport-right"><span>Preview quality</span><b>1/2</b></div>
        </div>
      </section>

      <aside className="inspector">
        <div className="panel-heading"><div><span className="eyebrow">PROPERTIES</span><h2>{selected?'Clip settings':'Project settings'}</h2></div><Settings2 size={17} className="muted-icon"/></div>
        {selected && selectedAsset ? <div className="inspector-content">
          <div className="selected-file"><div className="asset-thumb large">{selectedAsset.kind==='video'?<Film/>:selectedAsset.kind==='image'?<ImageIcon/>:<AudioLines/>}</div><div><b>{selectedAsset.name}</b><span>{selectedAsset.kind.toUpperCase()}</span></div></div>
          <label>Timeline start <input type="number" min="0" step="0.1" value={selected.start.toFixed(1)} onChange={e=>updateClip(selected.id,{start:Math.max(0,Number(e.target.value))})}/></label>
          <label>Duration (seconds) <input type="number" min="0.2" step="0.1" value={selected.duration.toFixed(1)} onChange={e=>updateClip(selected.id,{duration:Math.max(0.2,Number(e.target.value)),sourceOut:selected.sourceIn+Math.max(0.2,Number(e.target.value))})}/></label>
          <label>Source in (seconds) <input type="number" min="0" step="0.1" value={selected.sourceIn.toFixed(1)} onChange={e=>updateClip(selected.id,{sourceIn:Math.max(0,Number(e.target.value))})}/></label>
          <div className="property-actions"><button onClick={splitSelected}><Split size={15}/> Split at playhead</button><button className="danger" onClick={()=>removeClip(selected.id)}><Trash2 size={15}/> Delete clip</button></div>
        </div> : <div className="project-settings">
          <div className="setting-block"><span>CANVAS</span><b>1920 × 1080</b><small>Landscape · 16:9</small></div>
          <div className="setting-block"><span>FRAME RATE</span><b>30 FPS</b><small>Project frame rate</small></div>
          <div className="setting-block"><span>PROJECT DURATION</span><b>{fmt(totalDuration)}</b><small>Based on timeline content</small></div>
          <div className="hint-box"><Sparkles size={16}/><p>Select a clip on the timeline to edit its properties.</p></div>
        </div>}
      </aside>
    </main>

    <section className="timeline-panel">
      <div className="timeline-top">
        <div className="timeline-title"><Layers size={16}/><b>Timeline</b><span className="timeline-sub">MULTITRACK EDITOR</span></div>
        <div className="timeline-tools"><button onClick={splitSelected}><Scissors size={15}/> Split</button><button onClick={()=>setZoom(Math.max(18,zoom-8))}><ZoomOut size={15}/></button><input aria-label="Timeline zoom" type="range" min="18" max="90" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><button onClick={()=>setZoom(Math.min(90,zoom+8))}><ZoomIn size={15}/></button></div>
      </div>
      <div className="timeline-scroll">
        <div className="timeline-inner" style={{minWidth:`${Math.max(900,totalDuration*zoom+100)}px`}}>
          <div className="ruler"><div className="track-label ruler-label">TIME</div><div className="ruler-content">{Array.from({length:Math.ceil(totalDuration/5)+1},(_,i)=><div className="tick" key={i} style={{left:`${i*5*zoom}px`}}><span>{fmt(i*5)}</span></div>)}</div></div>
          <div className="track-row"><div className="track-label"><Film size={14}/> <span>V1</span></div><div className="track-content">
            {clips.filter(c=>c.track==='video').map(c=><button key={c.id} className={`timeline-clip video-clip ${selectedClipId===c.id?'selected':''}`} style={clipStyle(c)} onClick={()=>{selectClip(c.id);setPlayhead(c.start)}} title={assets.find(a=>a.id===c.assetId)?.name}><span>{assets.find(a=>a.id===c.assetId)?.name}</span><small>{fmt(c.duration)}</small></button>)}
          </div></div>
          <div className="track-row"><div className="track-label"><AudioLines size={14}/> <span>A1</span></div><div className="track-content audio-track">
            {clips.filter(c=>c.track==='audio').map(c=><button key={c.id} className={`timeline-clip audio-clip ${selectedClipId===c.id?'selected':''}`} style={clipStyle(c)} onClick={()=>{selectClip(c.id);setPlayhead(c.start)}}><span>{assets.find(a=>a.id===c.assetId)?.name}</span><div className="waveform">{Array.from({length:36},(_,i)=><i key={i} style={{height:`${15+((i*17)%25)}%`}}/>)}</div></button>)}
          </div></div>
          <button className="playhead" style={{left:`${78+playhead*zoom}px`}} onClick={()=>setPlayhead(playhead)} title="Playhead"><span/></button>
        </div>
      </div>
      <div className="timeline-footer"><span>{notice}</span><span>{clips.length} clips · {assets.length} media assets</span></div>
    </section>
    <footer className="statusbar"><span><span className="dot"/> Ready</span><span>AI VIDEO STUDIO · LOCAL PREVIEW BUILD</span><span>Autosave: session only</span></footer>
  </div>
}
