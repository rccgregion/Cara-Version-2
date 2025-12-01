# Cara | Professional AI Communication Coach

Cara is a world-class, production-ready AI platform designed to help international professionals bridge the "Communication Gap" in the American corporate world.

It leverages the **Google Gemini Live API** for real-time, interruptible voice simulations and **Multimodal Vision** for body language analysis.

## 🎨 Design System: "Editorial"

Cara uses a bespoke **Editorial Design System** inspired by Swiss print design.

- **Typography**: `Playfair Display` (Serif) for headings vs `Inter` (Sans) for UI.
- **Palette**: Stone (`#fafaf9` to `#1c1917`) and Teal (`#115e59`).
- **Layouts**: Asymmetric grids, structural borders, and tactile interactions.

## 🚀 Key Features

### 1. Live Simulation (Gemini Live API)

- **Architecture**: Uses **AudioWorklets** to process raw 16kHz PCM audio input off the main thread, ensuring zero UI freeze during sessions.
- **Audio Queueing**: Implements a jitter buffer to schedule incoming audio chunks for gapless playback.
- **Interruptibility**: Handles `interrupted` signals from Gemini to instantly clear the playback queue.

### 2. Director's Mode (Video Analysis)

- **Review**: Side-by-side "Director's Cut" playback of your recorded session with timestamped AI feedback.
- **Temporal Analysis**: Analyzes body language evolution over time using Gemini 2.5 Flash.

### 3. Listening Lab (Vinyl Player)

- **Interactive Player**: Functional seek bar, play/pause, and rotating vinyl visualizer.

### 4. Writing Studio (Advanced Reasoning)

- **Complex Tasks**: Uses **Gemini 3 Pro Preview** (Thinking Budget: 32768) for Resume Gap Analysis and Presentation Q&A simulation.
- **Modes**: Strict vs. Creative rewrite modes for Resume Optimization.

## 🛠️ Technical Architecture

### Audio Pipeline

1.  **Input**: `AudioWorkletProcessor` captures microphone data -> Main Thread -> WebSocket (Gemini).
2.  **Output**: WebSocket -> Jitter Buffer -> `AudioContext` destination.

### Security

- **Client-Side Proxy**: Checks `process.env.API_KEY` or prompts user for a session-based key.

## 📦 Project Structure

- `/services`: Gemini API integration, Audio Decoding.
- `/components`: Feature modules.
- `/styles`: Tailwind config.
