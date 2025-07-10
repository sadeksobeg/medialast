import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MediaService } from '../proxy/medias/media.service';
import { MediaDto } from '../proxy/medias/models';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';

// OpenShot-inspired interfaces for professional video editing
interface Timeline {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  sample_rate: number;
  channels: number;
  channel_layout: number;
  duration: number;
  scale: number;
  tick_pixels: number;
  playhead_position: number;
  layers: Layer[];
}

interface Layer {
  id: string;
  number: number;
  y: number;
  lock: boolean;
  label: string;
  clips: Clip[];
}

interface Clip {
  id: string;
  layer: number;
  position: number;
  start: number;
  end: number;
  duration: number;
  file_id?: string;
  title: string;
  reader?: FileReader;
  
  // Transform properties (OpenShot style)
  gravity: number;
  scale: number;
  scale_x: number;
  scale_y: number;
  location_x: number;
  location_y: number;
  rotation: number;
  alpha: number;
  
  // Audio properties
  volume: number;
  channel_filter: number;
  channel_mapping: number;
  
  // Effects
  effects: Effect[];
  
  // Keyframes
  keyframes: { [property: string]: Keyframe[] };
  
  // Waveform data
  waveform?: number[];
  
  // Thumbnail
  thumbnail?: string;
  
  // Type
  type: 'video' | 'audio' | 'image' | 'text';
}

interface Effect {
  id: string;
  type: string;
  class_name: string;
  short_name: string;
  description: string;
  has_audio: boolean;
  has_video: boolean;
  order: number;
  params: { [key: string]: any };
}

interface Keyframe {
  co: [number, number]; // [frame, value]
  interpolation: number; // 0=Bezier, 1=Linear, 2=Constant
  handle_left: [number, number];
  handle_right: [number, number];
}

interface FileReader {
  id: string;
  path: string;
  media_type: string;
  has_video: boolean;
  has_audio: boolean;
  duration: number;
  fps: number;
  width: number;
  height: number;
  pixel_ratio: number;
  display_ratio: number;
  sample_rate: number;
  channels: number;
  channel_layout: number;
  acodec: string;
  vcodec: string;
  video_bit_rate: number;
  audio_bit_rate: number;
  video_stream_index: number;
  audio_stream_index: number;
  video_timebase: number;
  audio_timebase: number;
  interlaced_frame: boolean;
  top_field_first: boolean;
}

interface Project {
  id: string;
  version: string;
  width: number;
  height: number;
  fps: number;
  sample_rate: number;
  channels: number;
  channel_layout: number;
  settings: ProjectSettings;
  clips: Clip[];
  effects: Effect[];
  files: FileReader[];
  layers: Layer[];
  markers: Marker[];
  profile: string;
  target: string;
  history: HistoryState[];
}

interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  sample_rate: number;
  channels: number;
  channel_layout: number;
  video_codec: string;
  audio_codec: string;
  video_bitrate: number;
  audio_bitrate: number;
  quality: string;
}

interface Marker {
  id: string;
  position: number;
  icon: string;
  comment: string;
}

interface HistoryState {
  id: string;
  type: string;
  description: string;
  data: any;
  timestamp: number;
}

interface Tool {
  name: string;
  icon: string;
  cursor: string;
  tooltip: string;
  shortcut: string;
}

interface PreviewSettings {
  quality: number;
  fps: number;
  width: number;
  height: number;
  aspect_ratio: string;
}

@Component({
  selector: 'app-studio',
  standalone: false,
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.scss',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-in', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-out', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class StudioComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('timelineContainer') timelineContainer!: ElementRef<HTMLDivElement>;

  // OpenShot-inspired project structure
  project: Project = {
    id: 'project-' + Date.now(),
    version: '3.0.0',
    width: 1920,
    height: 1080,
    fps: 30.0,
    sample_rate: 44100,
    channels: 2,
    channel_layout: 3,
    settings: {
      width: 1920,
      height: 1080,
      fps: 30.0,
      sample_rate: 44100,
      channels: 2,
      channel_layout: 3,
      video_codec: 'libx264',
      audio_codec: 'aac',
      video_bitrate: 8000000,
      audio_bitrate: 192000,
      quality: 'high'
    },
    clips: [],
    effects: [],
    files: [],
    layers: [],
    markers: [],
    profile: 'HD 1080p 30 fps',
    target: 'mp4',
    history: []
  };

  // Timeline state
  timeline: Timeline = {
    id: 'timeline-main',
    name: 'Main Timeline',
    fps: 30.0,
    width: 1920,
    height: 1080,
    sample_rate: 44100,
    channels: 2,
    channel_layout: 3,
    duration: 300.0, // 5 minutes default
    scale: 15.0, // pixels per second
    tick_pixels: 100,
    playhead_position: 0.0,
    layers: []
  };

  // UI State
  sidebarCollapsed: boolean = false;
  inspectorCollapsed: boolean = false;
  activeTab: string = 'files';
  isLoading: boolean = false;
  loadingMessage: string = '';
  
  // Tools (OpenShot style)
  tools: Tool[] = [
    { name: 'pointer', icon: 'cursor-arrow', cursor: 'default', tooltip: 'Selection Tool (V)', shortcut: 'V' },
    { name: 'razor', icon: 'scissors', cursor: 'crosshair', tooltip: 'Razor Tool (C)', shortcut: 'C' },
    { name: 'snap', icon: 'magnet', cursor: 'default', tooltip: 'Snapping (S)', shortcut: 'S' },
    { name: 'ripple', icon: 'ripple', cursor: 'ew-resize', tooltip: 'Ripple Edit', shortcut: 'R' }
  ];
  
  selectedTool: string = 'pointer';
  snapToGrid: boolean = true;
  
  // Navigation tabs (OpenShot style)
  navTabs = [
    { 
      id: 'files', 
      label: 'Project Files', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/></svg>' 
    },
    { 
      id: 'transitions', 
      label: 'Transitions', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18,6V4H6V6H18M6,10V8H18V10H6M6,14V12H18V14H6M6,18V16H18V18H6Z"/></svg>' 
    },
    { 
      id: 'effects', 
      label: 'Effects', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2Z"/></svg>' 
    },
    { 
      id: 'titles', 
      label: 'Titles', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5,4L19.66,8.35L18.7,8.61C18.25,7.74 17.79,6.87 17.26,6.43C16.73,6 16.11,6 15.5,6H13V16.5C13,17 13,17.5 13.5,17.5H14V19H10V17.5H10.5C11,17.5 11,17 11,16.5V6H8.5C7.89,6 7.27,6 6.74,6.43C6.21,6.87 5.75,7.74 5.3,8.61L4.34,8.35L5.5,4H18.5Z"/></svg>' 
    },
    { 
      id: 'emojis', 
      label: 'Emojis', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M7,9.5C7,8.7 7.7,8 8.5,8C9.3,8 10,8.7 10,9.5C10,10.3 9.3,11 8.5,11C7.7,11 7,10.3 7,9.5M14,9.5C14,8.7 14.7,8 15.5,8C16.3,8 17,8.7 17,9.5C17,10.3 16.3,11 15.5,11C14.7,11 14,10.3 14,9.5M12,17.23C10.25,17.23 8.71,16.5 7.81,15.42L9.23,14C9.68,14.72 10.75,15.23 12,15.23C13.25,15.23 14.32,14.72 14.77,14L16.19,15.42C15.29,16.5 13.75,17.23 12,17.23Z"/></svg>' 
    }
  ];

  // Search and filtering
  searchQuery: string = '';

  // Project state
  currentProjectName: string = 'Untitled Project';
  currentLanguage: string = 'EN';
  
  // Media
  allMedia: MediaDto[] = [];
  filteredMedia: MediaDto[] = [];
  selectedMedia: MediaDto | null = null;
  selectedVideoForPreview: string = '';

  // Playback state (OpenShot style)
  isPlaying: boolean = false;
  currentFrame: number = 0;
  totalFrames: number = 9000; // 5 minutes at 30fps
  volume: number = 100;
  isMuted: boolean = false;
  playbackSpeed: number = 1;
  previewSettings: PreviewSettings = {
    quality: 2, // 0=Low, 1=Med, 2=High
    fps: 30,
    width: 1920,
    height: 1080,
    aspect_ratio: '16:9'
  };

  // Timeline state (OpenShot inspired)
  timelineScale: number = 15.0; // pixels per second
  timelinePosition: number = 0;
  selectedClips: Clip[] = [];
  selectedClip: Clip | null = null;
  
  // Layers (OpenShot style - unlimited layers)
  videoLayers: Layer[] = [];
  audioLayers: Layer[] = [];
  
  // Track states
  mutedLayers: { [key: string]: boolean } = {};
  soloLayers: { [key: string]: boolean } = {};
  layerVolumes: { [key: string]: number } = {};
  lockedLayers: { [key: string]: boolean } = {};

  // Context menu
  contextMenu = { visible: false, x: 0, y: 0, clip: null as Clip | null };

  // History system (OpenShot style)
  historyIndex: number = -1;
  maxHistoryStates: number = 100;

  // Trimming state
  isTrimming: boolean = false;
  trimClip: Clip | null = null;
  trimSide: 'left' | 'right' = 'left';
  trimStartX: number = 0;
  trimStartPosition: number = 0;

  // Playhead dragging
  isDraggingPlayhead: boolean = false;
  playheadStartX: number = 0;

  // Export
  showExportModal: boolean = false;
  isExporting: boolean = false;
  exportProgress: number = 0;
  exportSettings = {
    profile: 'HD 1080p 30 fps',
    target: 'mp4',
    video_codec: 'libx264',
    audio_codec: 'aac',
    quality: 'high',
    video_bitrate: 8000000,
    audio_bitrate: 192000
  };

  // Effects library (OpenShot style)
  videoEffects: Effect[] = [
    {
      id: 'blur',
      type: 'Blur',
      class_name: 'Blur',
      short_name: 'blur',
      description: 'Blur the image',
      has_audio: false,
      has_video: true,
      order: 0,
      params: { sigma_x: 3.0, sigma_y: 3.0, iterations: 1 }
    },
    {
      id: 'brightness',
      type: 'Brightness & Contrast',
      class_name: 'Brightness',
      short_name: 'brightness',
      description: 'Adjust brightness and contrast',
      has_audio: false,
      has_video: true,
      order: 0,
      params: { brightness: 0.0, contrast: 1.0 }
    },
    {
      id: 'colorshift',
      type: 'Color Shift',
      class_name: 'ColorShift',
      short_name: 'colorshift',
      description: 'Shift RGB colors',
      has_audio: false,
      has_video: true,
      order: 0,
      params: { red_x: 0.0, red_y: 0.0, green_x: 0.0, green_y: 0.0, blue_x: 0.0, blue_y: 0.0 }
    },
    {
      id: 'saturation',
      type: 'Saturation',
      class_name: 'Saturation',
      short_name: 'saturation',
      description: 'Adjust color saturation',
      has_audio: false,
      has_video: true,
      order: 0,
      params: { saturation: 1.0, saturation_R: 1.0, saturation_G: 1.0, saturation_B: 1.0 }
    }
  ];

  // Transitions library
  transitions: Effect[] = [
    {
      id: 'fade',
      type: 'Fade',
      class_name: 'Fade',
      short_name: 'fade',
      description: 'Fade in/out transition',
      has_audio: true,
      has_video: true,
      order: 0,
      params: { brightness: 1.0 }
    },
    {
      id: 'slide',
      type: 'Slide',
      class_name: 'Slide',
      short_name: 'slide',
      description: 'Slide transition',
      has_audio: false,
      has_video: true,
      order: 0,
      params: { direction: 'left' }
    }
  ];

  // Title templates
  titleTemplates = [
    { id: '1', name: 'Simple Title', preview: 'Title', style: { fontSize: '48px', color: '#ffffff', fontFamily: 'Arial' } },
    { id: '2', name: 'Subtitle', preview: 'Subtitle', style: { fontSize: '32px', color: '#cccccc', fontFamily: 'Arial' } },
    { id: '3', name: 'Lower Third', preview: 'Name', style: { fontSize: '24px', color: '#ffffff', background: 'rgba(0,0,0,0.7)' } },
    { id: '4', name: 'End Credits', preview: 'Credits', style: { fontSize: '20px', color: '#ffffff', textAlign: 'center' } }
  ];

  // Toast notifications
  toasts: any[] = [];
  private toastIdCounter = 0;

  constructor(
    private mediaService: MediaService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeProject();
  }

  ngOnInit(): void {
    this.loadMedia();
    this.setupKeyboardShortcuts();
    this.saveHistoryState('Project Initialized', 'project_init');
    this.generateTimelineMarkers();
  }

  ngOnDestroy(): void {
    this.removeKeyboardShortcuts();
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  // OpenShot-inspired project initialization
  private initializeProject(): void {
    // Create default layers (OpenShot style)
    for (let i = 0; i < 5; i++) {
      const videoLayer: Layer = {
        id: `video-layer-${i}`,
        number: i,
        y: i * 60,
        lock: false,
        label: `Video ${i + 1}`,
        clips: []
      };
      this.videoLayers.push(videoLayer);
      this.timeline.layers.push(videoLayer);
    }

    for (let i = 0; i < 3; i++) {
      const audioLayer: Layer = {
        id: `audio-layer-${i}`,
        number: i + 5,
        y: (i + 5) * 60,
        lock: false,
        label: `Audio ${i + 1}`,
        clips: []
      };
      this.audioLayers.push(audioLayer);
      this.timeline.layers.push(audioLayer);
    }

    // Initialize layer states
    this.timeline.layers.forEach(layer => {
      this.mutedLayers[layer.id] = false;
      this.soloLayers[layer.id] = false;
      this.layerVolumes[layer.id] = 100;
      this.lockedLayers[layer.id] = false;
    });
  }

  // Keyboard shortcuts (OpenShot style)
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.togglePlayPause();
        break;
      case 'KeyV':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.setTool('pointer');
        }
        break;
      case 'KeyC':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.setTool('razor');
        }
        break;
      case 'KeyS':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.toggleSnapping();
        } else if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.saveProject();
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (this.selectedClips.length > 0) {
          event.preventDefault();
          this.deleteSelectedClips();
        }
        break;
      case 'KeyZ':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (event.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
        }
        break;
      case 'KeyY':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.redo();
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (event.shiftKey) {
          this.seekToFrame(this.currentFrame - 10);
        } else {
          this.seekToFrame(this.currentFrame - 1);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (event.shiftKey) {
          this.seekToFrame(this.currentFrame + 10);
        } else {
          this.seekToFrame(this.currentFrame + 1);
        }
        break;
      case 'Home':
        event.preventDefault();
        this.seekToFrame(0);
        break;
      case 'End':
        event.preventDefault();
        this.seekToFrame(this.totalFrames - 1);
        break;
    }
  }

  private setupKeyboardShortcuts(): void {
    // Already handled by @HostListener
  }

  private removeKeyboardShortcuts(): void {
    // Cleanup handled by @HostListener
  }

  // History system (OpenShot style)
  private saveHistoryState(description: string, type: string, data?: any): void {
    const state: HistoryState = {
      id: `history-${Date.now()}`,
      type: type,
      description: description,
      data: data || {
        clips: JSON.parse(JSON.stringify(this.project.clips)),
        layers: JSON.parse(JSON.stringify(this.timeline.layers)),
        playhead_position: this.timeline.playhead_position
      },
      timestamp: Date.now()
    };

    // Remove any states after current index
    this.project.history = this.project.history.slice(0, this.historyIndex + 1);
    
    this.project.history.push(state);
    this.historyIndex = this.project.history.length - 1;

    // Limit history size
    if (this.project.history.length > this.maxHistoryStates) {
      this.project.history.shift();
      this.historyIndex--;
    }
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = this.project.history[this.historyIndex];
      this.restoreHistoryState(state);
      this.showToast(`Undone: ${state.description}`, 'info');
    }
  }

  redo(): void {
    if (this.historyIndex < this.project.history.length - 1) {
      this.historyIndex++;
      const state = this.project.history[this.historyIndex];
      this.restoreHistoryState(state);
      this.showToast(`Redone: ${state.description}`, 'info');
    }
  }

  private restoreHistoryState(state: HistoryState): void {
    if (state.data) {
      this.project.clips = JSON.parse(JSON.stringify(state.data.clips || []));
      this.timeline.layers = JSON.parse(JSON.stringify(state.data.layers || []));
      this.timeline.playhead_position = state.data.playhead_position || 0;
      this.currentFrame = this.timeToFrame(this.timeline.playhead_position);
      this.cdr.detectChanges();
    }
  }

  // UI Methods
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleInspector(): void {
    this.inspectorCollapsed = !this.inspectorCollapsed;
  }

  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    if (tabId === 'files') {
      this.loadMedia();
    }
  }

  setTool(tool: string): void {
    this.selectedTool = tool;
    this.showToast(`Selected ${tool} tool`, 'info');
  }

  toggleSnapping(): void {
    this.snapToGrid = !this.snapToGrid;
    this.showToast(`Snapping ${this.snapToGrid ? 'enabled' : 'disabled'}`, 'info');
  }

  // Search and filtering
  onSearchChange(): void {
    this.filterMedia();
  }

  private filterMedia(): void {
    if (!this.searchQuery.trim()) {
      this.filteredMedia = [...this.allMedia];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredMedia = this.allMedia.filter(media =>
        media.title?.toLowerCase().includes(query) ||
        media.description?.toLowerCase().includes(query)
      );
    }
  }

  // Media management (OpenShot style)
  loadMedia(): void {
    this.isLoading = true;
    this.loadingMessage = 'Loading project files...';
    
    this.mediaService.getList({
      maxResultCount: 100,
      skipCount: 0,
      sorting: 'title'
    }).subscribe({
      next: (response) => {
        console.log('Raw media response:', response);
        
        this.allMedia = (response.items || []).map(media => {
          let processedMedia = { ...media };
          
          if (media.video && media.video.trim() !== '') {
            if (media.video.startsWith('blob:')) {
              processedMedia.video = media.video;
            } else if (media.video.startsWith('/')) {
              processedMedia.video = `${window.location.origin}${media.video}`;
            } else if (media.video.startsWith('http')) {
              processedMedia.video = media.video;
            } else {
              processedMedia.video = `${window.location.origin}/api/app/media/download-video/${media.id}`;
            }
          } else {
            processedMedia.video = `${window.location.origin}/api/app/media/download-video/${media.id}`;
          }
          
          // Create FileReader object (OpenShot style)
          const fileReader: FileReader = {
            id: media.id,
            path: processedMedia.video,
            media_type: 'video',
            has_video: true,
            has_audio: true,
            duration: 30.0, // Default duration
            fps: 30.0,
            width: 1920,
            height: 1080,
            pixel_ratio: 1.0,
            display_ratio: 1.777778,
            sample_rate: 44100,
            channels: 2,
            channel_layout: 3,
            acodec: 'aac',
            vcodec: 'h264',
            video_bit_rate: 8000000,
            audio_bit_rate: 192000,
            video_stream_index: 0,
            audio_stream_index: 1,
            video_timebase: 0.033333,
            audio_timebase: 0.000023,
            interlaced_frame: false,
            top_field_first: true
          };
          
          this.project.files.push(fileReader);
          
          return processedMedia;
        });
        
        this.filterMedia();
        this.isLoading = false;
        this.showToast(`Loaded ${this.allMedia.length} project files`, 'success');
      },
      error: (error) => {
        console.error('Failed to load media:', error);
        this.isLoading = false;
        this.showToast('Failed to load project files', 'error');
      }
    });
  }

  selectMedia(media: MediaDto): void {
    this.selectedMedia = media;
    console.log('Selected media:', media);
    this.showToast(`Selected: ${media.title}`, 'info');
  }

  addMediaToPreview(media: MediaDto): void {
    console.log('Adding media to preview:', media);
    this.selectedMedia = media;
    
    if (media.video && media.video.trim() !== '') {
      this.selectedVideoForPreview = media.video;
      console.log('Setting video URL:', this.selectedVideoForPreview);
      
      setTimeout(() => {
        if (this.videoPlayer?.nativeElement) {
          const video = this.videoPlayer.nativeElement;
          console.log('Video element found, loading:', this.selectedVideoForPreview);
          
          video.addEventListener('loadstart', () => console.log('Video load started'));
          video.addEventListener('loadedmetadata', () => {
            console.log('Video metadata loaded');
            this.updatePreviewSettings(video);
          });
          video.addEventListener('canplay', () => console.log('Video can play'));
          video.addEventListener('error', (e) => console.error('Video error:', e));
          
          video.src = this.selectedVideoForPreview;
          video.load();
          video.currentTime = this.frameToTime(this.currentFrame);
          this.showToast(`Now previewing: ${media.title}`, 'success');
        }
      }, 100);
    } else {
      this.showToast('No video available for this media', 'warning');
    }
  }

  private updatePreviewSettings(video: HTMLVideoElement): void {
    this.previewSettings.width = video.videoWidth || 1920;
    this.previewSettings.height = video.videoHeight || 1080;
    this.previewSettings.fps = 30; // Default, would need to detect actual fps
    this.previewSettings.aspect_ratio = `${this.previewSettings.width}:${this.previewSettings.height}`;
  }

  // File import (OpenShot style)
  openImportDialog(): void {
    this.fileInput.nativeElement.click();
  }

  handleFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files && files.length > 0) {
      this.isLoading = true;
      this.loadingMessage = 'Importing project files...';
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log('Processing file:', file.name, file.type, file.size);
        
        if (!file.type.startsWith('video/') && !file.type.startsWith('audio/') && !file.type.startsWith('image/')) {
          console.warn('Skipping unsupported file type:', file.type);
          continue;
        }
        
        const blobUrl = URL.createObjectURL(file);
        console.log('Created blob URL:', blobUrl);
        
        const mediaDto = {
          title: file.name.replace(/\.[^/.]+$/, ''),
          description: `Imported ${file.type} file`,
          video: blobUrl,
          metaData: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            importedAt: new Date().toISOString()
          }),
          projectId: '',
          sourceLanguage: 'en',
          destinationLanguage: 'en',
          countryDialect: ''
        };
        
        const localMedia: MediaDto = {
          id: `local-${Date.now()}-${i}`,
          title: mediaDto.title,
          video: mediaDto.video,
          description: mediaDto.description,
          metaData: mediaDto.metaData,
          sourceLanguage: mediaDto.sourceLanguage,
          destinationLanguage: mediaDto.destinationLanguage,
          countryDialect: mediaDto.countryDialect
        };
        
        this.allMedia.unshift(localMedia);
        
        // Create FileReader object
        const fileReader: FileReader = {
          id: localMedia.id,
          path: blobUrl,
          media_type: file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image',
          has_video: file.type.startsWith('video/') || file.type.startsWith('image/'),
          has_audio: file.type.startsWith('video/') || file.type.startsWith('audio/'),
          duration: 30.0,
          fps: 30.0,
          width: 1920,
          height: 1080,
          pixel_ratio: 1.0,
          display_ratio: 1.777778,
          sample_rate: 44100,
          channels: 2,
          channel_layout: 3,
          acodec: 'aac',
          vcodec: 'h264',
          video_bit_rate: 8000000,
          audio_bit_rate: 192000,
          video_stream_index: 0,
          audio_stream_index: 1,
          video_timebase: 0.033333,
          audio_timebase: 0.000023,
          interlaced_frame: false,
          top_field_first: true
        };
        
        this.project.files.push(fileReader);
      }
      
      this.filterMedia();
      this.isLoading = false;
      this.showToast(`Imported ${files.length} file(s) successfully!`, 'success');
      this.saveHistoryState('Files Imported', 'import_files');
    }
    
    input.value = '';
  }

  // Playback controls (OpenShot style with frame-based precision)
  togglePlayPause(): void {
    if (this.videoPlayer?.nativeElement) {
      const video = this.videoPlayer.nativeElement;
      if (this.isPlaying) {
        video.pause();
        this.isPlaying = false;
      } else {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            this.isPlaying = true;
          }).catch(error => {
            console.error('Video play failed:', error);
            this.showToast('Video playback failed', 'error');
          });
        }
      }
    } else {
      this.showToast('No video loaded for playback', 'warning');
    }
  }

  seekToFrame(frame: number): void {
    this.currentFrame = Math.max(0, Math.min(frame, this.totalFrames - 1));
    this.timeline.playhead_position = this.frameToTime(this.currentFrame);
    
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.currentTime = this.timeline.playhead_position;
    }
  }

  private frameToTime(frame: number): number {
    return frame / this.timeline.fps;
  }

  private timeToFrame(time: number): number {
    return Math.round(time * this.timeline.fps);
  }

  onVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    const duration = video.duration || 300;
    this.totalFrames = Math.round(duration * this.timeline.fps);
    this.timeline.duration = duration;
    this.generateTimelineMarkers();
    this.updatePreviewSettings(video);
    this.showToast('Video loaded successfully', 'success');
  }

  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.timeline.playhead_position = video.currentTime;
    this.currentFrame = this.timeToFrame(video.currentTime);
  }

  onVideoError(event: Event): void {
    const video = event.target as HTMLVideoElement;
    console.error('Video playback error:', video.error);
    this.showToast('Video playback error', 'error');
  }

  // Timeline controls (OpenShot style)
  zoomTimelineIn(): void {
    if (this.timelineScale < 100) {
      this.timelineScale *= 1.5;
      this.generateTimelineMarkers();
      this.showToast(`Timeline zoom: ${Math.round(this.timelineScale)}px/sec`, 'info');
    }
  }

  zoomTimelineOut(): void {
    if (this.timelineScale > 1) {
      this.timelineScale /= 1.5;
      this.generateTimelineMarkers();
      this.showToast(`Timeline zoom: ${Math.round(this.timelineScale)}px/sec`, 'info');
    }
  }

  fitTimelineToWindow(): void {
    if (this.timelineContainer?.nativeElement) {
      const containerWidth = this.timelineContainer.nativeElement.clientWidth - 200; // Account for track headers
      this.timelineScale = containerWidth / this.timeline.duration;
      this.generateTimelineMarkers();
      this.showToast('Timeline fitted to window', 'info');
    }
  }

  private generateTimelineMarkers(): void {
    // Generate time markers based on scale
    const markerInterval = this.getMarkerInterval();
    const markers = [];
    
    for (let time = 0; time <= this.timeline.duration; time += markerInterval) {
      markers.push({
        time: this.formatTime(time),
        position: (time / this.timeline.duration) * 100,
        frame: this.timeToFrame(time)
      });
    }
    
    this.timeline.tick_pixels = this.timelineScale * markerInterval;
  }

  private getMarkerInterval(): number {
    // Determine appropriate marker interval based on scale
    if (this.timelineScale > 50) return 1; // 1 second
    if (this.timelineScale > 20) return 5; // 5 seconds
    if (this.timelineScale > 5) return 10; // 10 seconds
    if (this.timelineScale > 1) return 30; // 30 seconds
    return 60; // 1 minute
  }

  // Layer management (OpenShot style)
  addVideoLayer(): void {
    const layerNumber = this.videoLayers.length;
    const newLayer: Layer = {
      id: `video-layer-${layerNumber}`,
      number: layerNumber,
      y: layerNumber * 60,
      lock: false,
      label: `Video ${layerNumber + 1}`,
      clips: []
    };
    
    this.videoLayers.push(newLayer);
    this.timeline.layers.push(newLayer);
    this.initializeLayerState(newLayer);
    this.saveHistoryState('Video Layer Added', 'add_layer');
    this.showToast(`Added Video Layer ${layerNumber + 1}`, 'success');
  }

  addAudioLayer(): void {
    const layerNumber = this.audioLayers.length;
    const newLayer: Layer = {
      id: `audio-layer-${layerNumber}`,
      number: this.videoLayers.length + layerNumber,
      y: (this.videoLayers.length + layerNumber) * 60,
      lock: false,
      label: `Audio ${layerNumber + 1}`,
      clips: []
    };
    
    this.audioLayers.push(newLayer);
    this.timeline.layers.push(newLayer);
    this.initializeLayerState(newLayer);
    this.saveHistoryState('Audio Layer Added', 'add_layer');
    this.showToast(`Added Audio Layer ${layerNumber + 1}`, 'success');
  }

  private initializeLayerState(layer: Layer): void {
    this.mutedLayers[layer.id] = false;
    this.soloLayers[layer.id] = false;
    this.layerVolumes[layer.id] = 100;
    this.lockedLayers[layer.id] = false;
  }

  toggleLayerMute(layerId: string): void {
    this.mutedLayers[layerId] = !this.mutedLayers[layerId];
    const layer = this.timeline.layers.find(l => l.id === layerId);
    this.showToast(`Layer ${layer?.label} ${this.mutedLayers[layerId] ? 'muted' : 'unmuted'}`, 'info');
  }

  toggleLayerLock(layerId: string): void {
    this.lockedLayers[layerId] = !this.lockedLayers[layerId];
    const layer = this.timeline.layers.find(l => l.id === layerId);
    this.showToast(`Layer ${layer?.label} ${this.lockedLayers[layerId] ? 'locked' : 'unlocked'}`, 'info');
  }

  setLayerVolume(layerId: string, volume: number): void {
    this.layerVolumes[layerId] = volume;
  }

  // Drag and Drop (OpenShot style)
  onClipDrop(event: CdkDragDrop<any>): void {
    console.log('Clip drop event:', event);
    const dragData = event.item.data;
    const dropData = event.container.data;
    
    if (dragData?.type === 'media' && dragData.media) {
      this.addMediaToTimeline(dragData.media, dropData.layerId, event);
    } else if (dragData?.type === 'effect' && dragData.effect) {
      this.applyEffectToSelectedClips(dragData.effect);
    } else if (dragData?.type === 'transition' && dragData.transition) {
      this.addTransition(dragData.transition, dropData.layerId, event);
    } else if (dragData?.id) {
      this.moveClip(dragData, dropData, event);
    }
  }

  onPreviewDrop(event: CdkDragDrop<any>): void {
    const dragData = event.item.data;
    
    if (dragData?.type === 'media' && dragData.media) {
      this.addMediaToPreview(dragData.media);
    }
  }

  // Clip operations (OpenShot style)
  private addMediaToTimeline(media: MediaDto, layerId: string, event?: any): void {
    console.log('Adding media to timeline:', media, layerId);
    
    const layer = this.timeline.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    // Calculate drop position
    let position = 0;
    if (event && event.container && event.container.element) {
      const rect = event.container.element.nativeElement.getBoundingClientRect();
      const dropX = event.dropPoint?.x || event.currentIndex * 100;
      position = Math.max(0, ((dropX - rect.left) / rect.width) * this.timeline.duration);
    }
    
    // Snap to grid if enabled
    if (this.snapToGrid) {
      position = Math.round(position * this.timeline.fps) / this.timeline.fps;
    }
    
    const fileReader = this.project.files.find(f => f.id === media.id);
    const duration = fileReader?.duration || 30.0;
    
    const newClip: Clip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      layer: layer.number,
      position: position,
      start: 0,
      end: duration,
      duration: duration,
      file_id: media.id,
      title: media.title || 'Untitled',
      reader: fileReader,
      
      // Transform properties (OpenShot defaults)
      gravity: 4, // Center
      scale: 1.0,
      scale_x: 1.0,
      scale_y: 1.0,
      location_x: 0.0,
      location_y: 0.0,
      rotation: 0.0,
      alpha: 1.0,
      
      // Audio properties
      volume: 1.0,
      channel_filter: -1,
      channel_mapping: -1,
      
      // Effects and keyframes
      effects: [],
      keyframes: {},
      
      // Type determination
      type: fileReader?.has_video ? 'video' : fileReader?.has_audio ? 'audio' : 'image',
      
      // Thumbnail
      thumbnail: media.video
    };
    
    // Add to layer and project
    layer.clips.push(newClip);
    this.project.clips.push(newClip);
    
    this.saveHistoryState(`Added ${media.title} to ${layer.label}`, 'add_clip');
    this.showToast(`Added "${media.title}" to ${layer.label}`, 'success');
  }

  selectClip(clip: Clip, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
      
      if (event.ctrlKey || event.metaKey) {
        // Multi-select
        const index = this.selectedClips.findIndex(c => c.id === clip.id);
        if (index >= 0) {
          this.selectedClips.splice(index, 1);
        } else {
          this.selectedClips.push(clip);
        }
      } else {
        // Single select
        this.selectedClips = [clip];
      }
    } else {
      this.selectedClips = [clip];
    }
    
    this.selectedClip = this.selectedClips[0] || null;
    this.showToast(`Selected ${this.selectedClips.length} clip(s)`, 'info');
  }

  deleteSelectedClips(): void {
    if (this.selectedClips.length === 0) return;
    
    this.selectedClips.forEach(clip => {
      // Remove from layer
      const layer = this.timeline.layers.find(l => l.number === clip.layer);
      if (layer) {
        layer.clips = layer.clips.filter(c => c.id !== clip.id);
      }
      
      // Remove from project
      this.project.clips = this.project.clips.filter(c => c.id !== clip.id);
    });
    
    this.saveHistoryState(`Deleted ${this.selectedClips.length} clip(s)`, 'delete_clips');
    this.showToast(`Deleted ${this.selectedClips.length} clip(s)`, 'success');
    this.selectedClips = [];
    this.selectedClip = null;
  }

  // Effects (OpenShot style)
  applyEffectToSelectedClips(effect: Effect): void {
    if (this.selectedClips.length === 0) {
      this.showToast('Please select clips first', 'warning');
      return;
    }
    
    this.selectedClips.forEach(clip => {
      const effectCopy = JSON.parse(JSON.stringify(effect));
      effectCopy.id = `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      clip.effects.push(effectCopy);
    });
    
    this.saveHistoryState(`Applied ${effect.type} effect`, 'apply_effect');
    this.showToast(`Applied ${effect.type} to ${this.selectedClips.length} clip(s)`, 'success');
  }

  removeEffectFromClip(clip: Clip, effectIndex: number): void {
    if (clip.effects && effectIndex >= 0 && effectIndex < clip.effects.length) {
      const effect = clip.effects[effectIndex];
      clip.effects.splice(effectIndex, 1);
      this.saveHistoryState(`Removed ${effect.type} effect`, 'remove_effect');
      this.showToast(`Removed ${effect.type} effect`, 'info');
    }
  }

  // Project management
  saveProject(): void {
    // In a real implementation, this would save to backend
    const projectData = JSON.stringify(this.project, null, 2);
    console.log('Saving project:', projectData);
    this.showToast('Project saved', 'success');
  }

  exportProject(): void {
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
    this.isExporting = false;
    this.exportProgress = 0;
  }

  startExport(): void {
    this.isExporting = true;
    this.exportProgress = 0;
    
    // Simulate export process
    const interval = setInterval(() => {
      this.exportProgress += 2;
      
      if (this.exportProgress >= 100) {
        clearInterval(interval);
        this.isExporting = false;
        this.showToast('Video exported successfully!', 'success');
        this.closeExportModal();
      }
    }, 100);
  }

  // Utility methods
  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatFrame(frame: number): string {
    return frame.toString().padStart(6, '0');
  }

  // Timeline position calculations
  getClipLeft(clip: Clip): number {
    return clip.position * this.timelineScale;
  }

  getClipWidth(clip: Clip): number {
    return clip.duration * this.timelineScale;
  }

  getPlayheadLeft(): number {
    return this.timeline.playhead_position * this.timelineScale;
  }

  // TrackBy functions for performance
  trackByIndex(index: number): number {
    return index;
  }

  trackByMediaId(index: number, media: MediaDto): string {
    return media.id;
  }

  trackByClipId(index: number, clip: Clip): string {
    return clip.id;
  }

  trackByLayerId(index: number, layer: Layer): string {
    return layer.id;
  }

  trackByEffectId(index: number, effect: Effect): string {
    return effect.id;
  }

  // Mouse event handlers
  private onMouseMove = (event: MouseEvent): void => {
    // Handle trimming, playhead dragging, etc.
  };

  private onMouseUp = (): void => {
    // Clean up mouse operations
  };

  // Toast notifications
  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    const toast = {
      id: (++this.toastIdCounter).toString(),
      message,
      type
    };
    
    this.toasts.push(toast);
    
    setTimeout(() => {
      this.dismissToast(toast.id);
    }, 4000);
  }

  dismissToast(toastId: string): void {
    this.toasts = this.toasts.filter(t => t.id !== toastId);
  }

  // Placeholder methods for template
  onMediaThumbnailError(event: Event, media: MediaDto): void {
    console.error('Media thumbnail failed to load:', media.title);
  }

  onThumbnailLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    video.currentTime = 1;
  }

  addTextElement(template: any): void {
    // Add text element to timeline
  }

  openAudioTool(toolType: string): void {
    this.showToast(`Opening ${toolType} tool...`, 'info');
  }

  generateAutoCaption(): void {
    this.showToast('Generating auto captions...', 'info');
  }

  importSubtitles(): void {
    this.showToast('Import subtitles feature coming soon', 'info');
  }

  private moveClip(dragData: any, dropData: any, event: any): void {
    // Move clip between layers
  }

  private addTransition(transition: Effect, layerId: string, event: any): void {
    // Add transition between clips
  }
}