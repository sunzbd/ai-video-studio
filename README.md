# AI Video Studio — First Deliverable

A runnable local-first React + TypeScript video editing workspace.

## Included in this build

- Import multiple video, image, and audio files from your computer.
- Preview the active video or image in the browser.
- Add assets to a two-track video/audio timeline.
- Assemble an initial sequence from imported visual assets.
- Select clips and edit their timeline position, duration, and source-in point.
- Split clips at the playhead and delete clips.
- Play/pause the preview and adjust timeline zoom.
- Download a JSON project manifest.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Deployment

The workflow at `.github/workflows/deploy.yml` builds the frontend and deploys it to GitHub Pages on pushes to `main`.

In the repository, open **Settings → Pages → Build and deployment** and choose **GitHub Actions** as the source. The public site URL is:

https://sunzbd.github.io/ai-video-studio/

## Current limitations

This is the first functional frontend foundation, not a completed AI SaaS backend.

- Auto Edit currently arranges visuals in upload order; it does not understand voiceover meaning or semantically match scenes.
- Audio assets can be placed on the timeline, but audio playback/mixing is not yet wired into the preview.
- Export downloads an editable JSON project manifest, not a rendered MP4.
- Projects remain in browser memory for this initial build. Persistent cloud projects and autosave are not connected.
- Scene analysis, transcription, AI scene matching, cloud storage, and FFmpeg rendering require backend services and are future milestones.
