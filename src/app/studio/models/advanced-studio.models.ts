// Advanced Professional Video Editing Models
export interface AdvancedTimeline {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  sampleRate: number;
  channels: number;
  duration: number;
  position: number;
  scale: number;
  zoom: number;
  tracks: Track[];
  markers: Marker[];
  keyframes: GlobalKeyframe[];
  settings: TimelineSettings;
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'subtitle' | 'overlay';
  name: string;
  index: number;
  height: number;
  locked: boolean;
  muted: boolean;
  hidden: boolean;
  solo: boolean;
  color: string;
  clips: Clip[];
  effects: Effect[];
  volume: number;
  pan: number;
}

export interface Clip {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'shape';
  trackId: string;
  resourceId: string;
  
  // Timeline positioning
  start: number;
  duration: number;
  end: number;
  
  // Source trimming
  in: number;
  out: number;
  
  // Transform properties
  transform: ClipTransform;
  
  // Visual properties
  opacity: number;
  blendMode: BlendMode;
  
  // Audio properties
  volume: number;
  pan: number;
  muted: boolean;
  
  // Effects and filters
  effects: Effect[];
  
  // Keyframes for animation
  keyframes: ClipKeyframe[];
  
  // Metadata
  thumbnail?: string;
  waveform?: number[];
  selected: boolean;
  locked: boolean;
  
  // Advanced properties
  speed: number;
  reverse: boolean;
  fadeIn: number;
  fadeOut: number;
}

export interface ClipTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  anchorX: number;
  anchorY: number;
  skewX: number;
  skewY: number;
}

export interface Effect {
  id: string;
  name: string;
  type: EffectType;
  enabled: boolean;
  parameters: EffectParameter[];
  keyframes: EffectKeyframe[];
  presetId?: string;
}

export interface EffectParameter {
  id: string;
  name: string;
  type: 'number' | 'boolean' | 'color' | 'text' | 'select' | 'file';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  animatable: boolean;
}

export interface ClipKeyframe {
  id: string;
  time: number;
  property: string;
  value: any;
  interpolation: InterpolationType;
  easing: EasingType;
}

export interface EffectKeyframe {
  id: string;
  time: number;
  parameterId: string;
  value: any;
  interpolation: InterpolationType;
  easing: EasingType;
}

export interface GlobalKeyframe {
  id: string;
  time: number;
  name: string;
  color: string;
  description?: string;
}

export interface Marker {
  id: string;
  time: number;
  name: string;
  color: string;
  type: 'chapter' | 'cue' | 'comment';
  description?: string;
}

export interface Transition {
  id: string;
  type: TransitionType;
  duration: number;
  parameters: EffectParameter[];
  fromClipId: string;
  toClipId: string;
}

export interface AdvancedResource {
  id: string;
  name: string;
  path: string;
  type: 'video' | 'audio' | 'image' | 'font' | 'preset';
  
  // Media properties
  duration?: number;
  fps?: number;
  width?: number;
  height?: number;
  channels?: number;
  sampleRate?: number;
  bitrate?: number;
  codec?: string;
  
  // File properties
  size: number;
  format: string;
  createdAt: Date;
  modifiedAt: Date;
  
  // Preview data
  thumbnail?: string;
  waveform?: number[];
  metadata?: MediaMetadata;
  
  // Organization
  tags: string[];
  category: string;
  favorite: boolean;
}

export interface MediaMetadata {
  title?: string;
  description?: string;
  author?: string;
  copyright?: string;
  keywords?: string[];
  location?: string;
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: number;
  shutterSpeed?: string;
}

export interface TimelineSettings {
  snapToGrid: boolean;
  snapToClips: boolean;
  snapToMarkers: boolean;
  magneticTimeline: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  previewQuality: PreviewQuality;
  audioScrubbing: boolean;
  showWaveforms: boolean;
  showThumbnails: boolean;
}

export interface ExportSettings {
  format: 'mp4' | 'webm' | 'mov' | 'avi' | 'gif';
  codec: string;
  quality: number;
  bitrate: number;
  fps: number;
  width: number;
  height: number;
  audioCodec: string;
  audioBitrate: number;
  audioSampleRate: number;
  startTime?: number;
  endTime?: number;
  includeAudio: boolean;
  watermark?: WatermarkSettings;
}

export interface WatermarkSettings {
  enabled: boolean;
  type: 'text' | 'image';
  content: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  size: number;
}

export interface PlaybackState {
  playing: boolean;
  position: number;
  speed: number;
  loop: boolean;
  volume: number;
  muted: boolean;
  inPoint?: number;
  outPoint?: number;
  quality: PreviewQuality;
}

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showSafeAreas: boolean;
  showRulers: boolean;
  aspectRatio: string;
  backgroundColor: string;
}

export interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
  currentIndex: number;
  maxStates: number;
  description: string;
}

// Enums
export enum EffectType {
  COLOR_CORRECTION = 'color-correction',
  BLUR = 'blur',
  SHARPEN = 'sharpen',
  NOISE_REDUCTION = 'noise-reduction',
  STABILIZATION = 'stabilization',
  CHROMA_KEY = 'chroma-key',
  MASK = 'mask',
  TRANSFORM = 'transform',
  DISTORTION = 'distortion',
  ARTISTIC = 'artistic',
  AUDIO_FILTER = 'audio-filter',
  AUDIO_EQ = 'audio-eq',
  AUDIO_COMPRESSOR = 'audio-compressor',
  AUDIO_REVERB = 'audio-reverb'
}

export enum TransitionType {
  CUT = 'cut',
  FADE = 'fade',
  DISSOLVE = 'dissolve',
  WIPE = 'wipe',
  SLIDE = 'slide',
  PUSH = 'push',
  ZOOM = 'zoom',
  SPIN = 'spin',
  CUBE = 'cube',
  FLIP = 'flip'
}

export enum BlendMode {
  NORMAL = 'normal',
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
  OVERLAY = 'overlay',
  SOFT_LIGHT = 'soft-light',
  HARD_LIGHT = 'hard-light',
  COLOR_DODGE = 'color-dodge',
  COLOR_BURN = 'color-burn',
  DARKEN = 'darken',
  LIGHTEN = 'lighten',
  DIFFERENCE = 'difference',
  EXCLUSION = 'exclusion'
}

export enum InterpolationType {
  LINEAR = 'linear',
  BEZIER = 'bezier',
  STEP = 'step',
  SMOOTH = 'smooth'
}

export enum EasingType {
  EASE = 'ease',
  EASE_IN = 'ease-in',
  EASE_OUT = 'ease-out',
  EASE_IN_OUT = 'ease-in-out',
  LINEAR = 'linear',
  BOUNCE = 'bounce',
  ELASTIC = 'elastic'
}

export enum PreviewQuality {
  QUARTER = 'quarter',
  HALF = 'half',
  FULL = 'full',
  AUTO = 'auto'
}

// Tool types
export interface Tool {
  id: string;
  name: string;
  icon: string;
  cursor: string;
  shortcut: string;
  active: boolean;
}

export enum ToolType {
  SELECT = 'select',
  RAZOR = 'razor',
  SLIP = 'slip',
  SLIDE = 'slide',
  ZOOM = 'zoom',
  HAND = 'hand',
  TEXT = 'text',
  SHAPE = 'shape'
}

// Advanced editing operations
export interface EditOperation {
  id: string;
  type: OperationType;
  timestamp: number;
  data: any;
  description: string;
}

export enum OperationType {
  ADD_CLIP = 'add-clip',
  REMOVE_CLIP = 'remove-clip',
  MOVE_CLIP = 'move-clip',
  TRIM_CLIP = 'trim-clip',
  SPLIT_CLIP = 'split-clip',
  ADD_EFFECT = 'add-effect',
  REMOVE_EFFECT = 'remove-effect',
  ADD_KEYFRAME = 'add-keyframe',
  REMOVE_KEYFRAME = 'remove-keyframe',
  ADD_TRACK = 'add-track',
  REMOVE_TRACK = 'remove-track'
}