import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Import our new services and components
import { TimelineService } from './services/timeline.service';
import { StudioMediaService } from './services/media.service';
import { VideoEditingApiService } from './services/video-editing-api.service';
import { TimelineComponent } from './components/timeline/timeline.component';
import { MediaBinComponent } from './components/media-bin/media-bin.component';
import { PreviewComponent } from './components/preview/preview.component';
import { ApiConsoleComponent } from './components/api-console/api-console.component';
import { TimelineVisualizerComponent } from './components/timeline-visualizer/timeline-visualizer.component';
import { Timeline, PlaybackState, Resource } from './models/studio.models';

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
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    TimelineComponent,
    MediaBinComponent,
    PreviewComponent,
    ApiConsoleComponent,
    TimelineVisualizerComponent
  ],
  templateUrl: './studio.component.html',
  styleUrls: ['./studio.component.scss']
})
export class StudioComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Application state
  timeline: Timeline = {
    fps: 25,
    width: 1920,
    height: 1080,
    duration: 0,
    position: 0,
    scale: 1,
    videoTracks: [],
    audioTracks: []
  };

  playback: PlaybackState = {
    playing: false,
    position: 0,
    speed: 1,
    loop: false,
    volume: 1,
    muted: false
  };

  resources: Resource[] = [];
  projectName = 'Untitled Project';
  isFullscreen = false;
  activeRightPanel: 'visualizer' | 'console' = 'visualizer';

  private destroy$ = new Subject<void>();

  constructor(
    private timelineService: TimelineService,
    private mediaService: StudioMediaService,
    private apiService: VideoEditingApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
  }

  ngOnInit(): void {
    this.timelineService.timeline$
      .pipe(takeUntil(this.destroy$))
      .subscribe(timeline => {
        this.timeline = timeline;
      });

    this.timelineService.playback$
      .pipe(takeUntil(this.destroy$))
      .subscribe(playback => {
        this.playback = playback;
      });

    this.mediaService.resources$
      .pipe(takeUntil(this.destroy$))
      .subscribe(resources => {
        this.resources = resources;
      });

    // Initialize API service with default project
    this.apiService.createProject('Professional Video Project');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.timelineService.togglePlayback();
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
        if (this.timelineService.selectedClips$.value.length > 0) {
          event.preventDefault();
          this.timelineService.deleteSelectedClips();
        }
        break;
      case 'KeyZ':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (event.shiftKey) {
            // this.redo();
          } else {
            // this.undo();
          }
        }
        break;
      case 'KeyY':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          // this.redo();
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (event.shiftKey) {
          this.timelineService.setPlaybackPosition(this.playback.position - 1);
        } else {
          this.timelineService.setPlaybackPosition(this.playback.position - 0.04);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (event.shiftKey) {
          this.timelineService.setPlaybackPosition(this.playback.position + 1);
        } else {
          this.timelineService.setPlaybackPosition(this.playback.position + 0.04);
        }
        break;
      case 'Home':
        event.preventDefault();
        this.timelineService.setPlaybackPosition(0);
        break;
      case 'End':
        event.preventDefault();
        this.timelineService.setPlaybackPosition(this.timeline.duration);
        break;
    }
  }

  // Tool methods
  toggleSnapping(): void {
    // Toggle snapping functionality
    console.log('Toggle snapping');
  }

  // File import
  importMedia(): void {
    this.fileInput.nativeElement.click();
  }

  handleFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        this.mediaService.addResource(file).then(resource => {
          console.log('Added resource:', resource);
        }).catch(error => {
          console.error('Failed to add resource:', error);
        });
      });
      }
    
    input.value = '';
  }

  // Project management
  saveProject(): void {
    console.log('Saving project...');
  }

  exportProject(): void {
    console.log('Exporting project...');
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  toggleApiConsole(): void {
    this.activeRightPanel = this.activeRightPanel === 'console' ? 'visualizer' : 'console';
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private setTool(tool: string): void {
    console.log(`Selected tool: ${tool}`);
  }
}