import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Import enhanced services and components
import { AdvancedTimelineService } from './services/advanced-timeline.service';
import { StudioMediaService } from './services/media.service';
import { VideoEditingApiService } from './services/video-editing-api.service';
import { AdvancedTimelineComponent } from './components/advanced-timeline/advanced-timeline.component';
import { MediaBinComponent } from './components/media-bin/media-bin.component';
import { PreviewComponent } from './components/preview/preview.component';
import { ApiConsoleComponent } from './components/api-console/api-console.component';
import { TimelineVisualizerComponent } from './components/timeline-visualizer/timeline-visualizer.component';
import { EffectsPanelComponent } from './components/effects-panel/effects-panel.component';
import { 
  AdvancedTimeline, 
  PlaybackState, 
  ViewportState, 
  UndoRedoState,
  ToolType 
} from './models/advanced-studio.models';

@Component({
  selector: 'app-studio',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    AdvancedTimelineComponent,
    MediaBinComponent,
    PreviewComponent,
    ApiConsoleComponent,
    TimelineVisualizerComponent,
    EffectsPanelComponent
  ],
  template: `
    <div class="professional-studio" [class.fullscreen]="isFullscreen">
      <!-- Top Menu Bar -->
      <div class="menu-bar">
        <div class="menu-left">
          <div class="app-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
            </svg>
            <span>Professional Video Studio</span>
          </div>
          
          <div class="menu-items">
            <div class="menu-dropdown">
              <button class="menu-btn">File</button>
              <div class="dropdown-content">
                <a (click)="newProject()">New Project</a>
                <a (click)="openProject()">Open Project</a>
                <a (click)="saveProject()">Save Project</a>
                <a (click)="saveProjectAs()">Save As...</a>
                <hr>
                <a (click)="importMedia()">Import Media</a>
                <a (click)="exportProject()">Export Video</a>
              </div>
            </div>
            
            <div class="menu-dropdown">
              <button class="menu-btn">Edit</button>
              <div class="dropdown-content">
                <a (click)="undo()" [class.disabled]="!undoRedo.canUndo">
                  Undo {{ undoRedo.description }}
                </a>
                <a (click)="redo()" [class.disabled]="!undoRedo.canRedo">Redo</a>
                <hr>
                <a (click)="cut()">Cut</a>
                <a (click)="copy()">Copy</a>
                <a (click)="paste()">Paste</a>
                <a (click)="delete()">Delete</a>
                <hr>
                <a (click)="selectAll()">Select All</a>
              </div>
            </div>
            
            <div class="menu-dropdown">
              <button class="menu-btn">View</button>
              <div class="dropdown-content">
                <a (click)="togglePanel('media')" [class.active]="visiblePanels.media">
                  Media Bin
                </a>
                <a (click)="togglePanel('effects')" [class.active]="visiblePanels.effects">
                  Effects Panel
                </a>
                <a (click)="togglePanel('preview')" [class.active]="visiblePanels.preview">
                  Preview
                </a>
                <a (click)="togglePanel('timeline')" [class.active]="visiblePanels.timeline">
                  Timeline
                </a>
                <hr>
                <a (click)="resetLayout()">Reset Layout</a>
              </div>
            </div>
            
            <div class="menu-dropdown">
              <button class="menu-btn">Timeline</button>
              <div class="dropdown-content">
                <a (click)="addVideoTrack()">Add Video Track</a>
                <a (click)="addAudioTrack()">Add Audio Track</a>
                <hr>
                <a (click)="fitToWindow()">Fit to Window</a>
                <a (click)="zoomIn()">Zoom In</a>
                <a (click)="zoomOut()">Zoom Out</a>
              </div>
            </div>
            
            <div class="menu-dropdown">
              <button class="menu-btn">Tools</button>
              <div class="dropdown-content">
                <a (click)="setTool('select')" [class.active]="activeTool === 'select'">
                  Selection Tool (V)
                </a>
                <a (click)="setTool('razor')" [class.active]="activeTool === 'razor'">
                  Razor Tool (C)
                </a>
                <a (click)="setTool('slip')" [class.active]="activeTool === 'slip'">
                  Slip Tool
                </a>
                <a (click)="setTool('zoom')" [class.active]="activeTool === 'zoom'">
                  Zoom Tool
                </a>
              </div>
            </div>
            
            <button class="menu-btn" (click)="toggleApiConsole()">API Console</button>
          </div>
        </div>
        
        <div class="menu-center">
          <div class="project-info">
            <div class="project-name">{{ timeline.name }}</div>
            <div class="project-stats">
              {{ formatTime(playback.position) }} / {{ formatTime(timeline.duration) }}
              | {{ timeline.fps }}fps | {{ timeline.width }}x{{ timeline.height }}
            </div>
          </div>
        </div>
        
        <div class="menu-right">
          <div class="playback-controls">
            <button class="playback-btn" (click)="goToStart()" title="Go to Start">
              <i class="icon-skip-start"></i>
            </button>
            <button class="playback-btn" (click)="stepBackward()" title="Step Backward">
              <i class="icon-step-backward"></i>
            </button>
            <button 
              class="playback-btn play-pause" 
              (click)="togglePlayback()" 
              [title]="playback.playing ? 'Pause' : 'Play'"
            >
              <i [class]="playback.playing ? 'icon-pause' : 'icon-play'"></i>
            </button>
            <button class="playback-btn" (click)="stepForward()" title="Step Forward">
              <i class="icon-step-forward"></i>
            </button>
            <button class="playback-btn" (click)="goToEnd()" title="Go to End">
              <i class="icon-skip-end"></i>
            </button>
          </div>
          
          <div class="menu-actions">
            <button class="menu-btn" (click)="saveProject()">Save</button>
            <button class="menu-btn export-btn" (click)="exportProject()">Export</button>
            <button class="menu-btn" (click)="toggleFullscreen()">
              <i class="icon-fullscreen"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="studio-content">
        <!-- Left Panel -->
        <div class="left-panel" *ngIf="visiblePanels.media || visiblePanels.effects">
          <div class="panel-tabs">
            <button 
              class="tab-btn"
              [class.active]="activeLeftPanel === 'media'"
              (click)="activeLeftPanel = 'media'"
              *ngIf="visiblePanels.media"
            >
              <i class="icon-media"></i>
              Media
            </button>
            <button 
              class="tab-btn"
              [class.active]="activeLeftPanel === 'effects'"
              (click)="activeLeftPanel = 'effects'"
              *ngIf="visiblePanels.effects"
            >
              <i class="icon-effects"></i>
              Effects
            </button>
          </div>
          
          <div class="panel-content">
            <app-media-bin *ngIf="activeLeftPanel === 'media'"></app-media-bin>
            <app-effects-panel *ngIf="activeLeftPanel === 'effects'"></app-effects-panel>
          </div>
        </div>

        <!-- Center Panel -->
        <div class="center-panel" *ngIf="visiblePanels.preview">
          <app-preview></app-preview>
        </div>

        <!-- Right Panel -->
        <div class="right-panel" *ngIf="showRightPanel">
          <div class="panel-tabs">
            <button 
              class="tab-btn"
              [class.active]="activeRightPanel === 'visualizer'"
              (click)="activeRightPanel = 'visualizer'"
            >
              <i class="icon-timeline"></i>
              Timeline
            </button>
            <button 
              class="tab-btn"
              [class.active]="activeRightPanel === 'console'"
              (click)="activeRightPanel = 'console'"
            >
              <i class="icon-console"></i>
              Console
            </button>
          </div>
          
          <div class="panel-content">
            <app-timeline-visualizer *ngIf="activeRightPanel === 'visualizer'"></app-timeline-visualizer>
            <app-api-console *ngIf="activeRightPanel === 'console'"></app-api-console>
          </div>
        </div>
      </div>

      <!-- Bottom Panel - Timeline -->
      <div class="bottom-panel" *ngIf="visiblePanels.timeline">
        <app-advanced-timeline></app-advanced-timeline>
      </div>

      <!-- Status Bar -->
      <div class="status-bar">
        <div class="status-left">
          <span class="status-item">Tool: {{ getToolName(activeTool) }}</span>
          <span class="status-item">Zoom: {{ (timeline.zoom * 100) | number:'1.0-0' }}%</span>
          <span class="status-item">Tracks: {{ timeline.tracks.length }}</span>
        </div>
        
        <div class="status-center">
          <span class="status-item">{{ getSelectionInfo() }}</span>
        </div>
        
        <div class="status-right">
          <span class="status-item">{{ timeline.width }}x{{ timeline.height }}</span>
          <span class="status-item">{{ timeline.fps }} FPS</span>
          <span class="status-item" [class.recording]="isRecording">
            {{ isRecording ? 'REC' : 'READY' }}
          </span>
        </div>
      </div>

      <!-- Hidden file input -->
      <input 
        type="file" 
        #fileInput 
        style="display: none;" 
        accept="video/*,audio/*,image/*" 
        multiple
        (change)="handleFileImport($event)"
      />
    </div>
  `,
  styleUrls: ['./studio.component.scss']
})
export class StudioComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Application state
  timeline!: AdvancedTimeline;
  playback!: PlaybackState;
  viewport!: ViewportState;
  undoRedo!: UndoRedoState;
  activeTool: ToolType = ToolType.SELECT;
  selectedClips: string[] = [];

  // UI state
  isFullscreen = false;
  isRecording = false;
  activeLeftPanel: 'media' | 'effects' = 'media';
  activeRightPanel: 'visualizer' | 'console' = 'visualizer';
  
  visiblePanels = {
    media: true,
    effects: true,
    preview: true,
    timeline: true
  };

  get showRightPanel(): boolean {
    return this.activeRightPanel === 'console' || this.activeRightPanel === 'visualizer';
  }

  private destroy$ = new Subject<void>();

  constructor(
    private timelineService: AdvancedTimelineService,
    private mediaService: StudioMediaService,
    private apiService: VideoEditingApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to timeline state
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

    this.timelineService.viewport$
      .pipe(takeUntil(this.destroy$))
      .subscribe(viewport => {
        this.viewport = viewport;
      });

    this.timelineService.undoRedo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(undoRedo => {
        this.undoRedo = undoRedo;
      });

    this.timelineService.activeTool$
      .pipe(takeUntil(this.destroy$))
      .subscribe(activeTool => {
        this.activeTool = activeTool;
      });

    this.timelineService.selectedClips$
      .pipe(takeUntil(this.destroy$))
      .subscribe(selectedClips => {
        this.selectedClips = selectedClips;
      });

    // Initialize API service
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

    const ctrl = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey;

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.togglePlayback();
        break;
      
      case 'KeyV':
        if (!ctrl) {
          event.preventDefault();
          this.setTool('select');
        }
        break;
      
      case 'KeyC':
        if (!ctrl) {
          event.preventDefault();
          this.setTool('razor');
        } else {
          event.preventDefault();
          this.copy();
        }
        break;
      
      case 'KeyX':
        if (ctrl) {
          event.preventDefault();
          this.cut();
        }
        break;
      
      case 'KeyV':
        if (ctrl) {
          event.preventDefault();
          this.paste();
        }
        break;
      
      case 'KeyS':
        if (ctrl) {
          event.preventDefault();
          if (shift) {
            this.saveProjectAs();
          } else {
            this.saveProject();
          }
        }
        break;
      
      case 'KeyZ':
        if (ctrl) {
          event.preventDefault();
          if (shift) {
            this.redo();
          } else {
            this.undo();
          }
        }
        break;
      
      case 'KeyY':
        if (ctrl) {
          event.preventDefault();
          this.redo();
        }
        break;
      
      case 'Delete':
      case 'Backspace':
        if (this.selectedClips.length > 0) {
          event.preventDefault();
          this.delete();
        }
        break;
      
      case 'KeyA':
        if (ctrl) {
          event.preventDefault();
          this.selectAll();
        }
        break;
      
      case 'ArrowLeft':
        event.preventDefault();
        if (shift) {
          this.timelineService.setPlaybackPosition(this.playback.position - 1);
        } else {
          this.stepBackward();
        }
        break;
      
      case 'ArrowRight':
        event.preventDefault();
        if (shift) {
          this.timelineService.setPlaybackPosition(this.playback.position + 1);
        } else {
          this.stepForward();
        }
        break;
      
      case 'Home':
        event.preventDefault();
        this.goToStart();
        break;
      
      case 'End':
        event.preventDefault();
        this.goToEnd();
        break;
      
      case 'Equal':
      case 'NumpadAdd':
        if (ctrl) {
          event.preventDefault();
          this.zoomIn();
        }
        break;
      
      case 'Minus':
      case 'NumpadSubtract':
        if (ctrl) {
          event.preventDefault();
          this.zoomOut();
        }
        break;
      
      case 'Digit0':
        if (ctrl) {
          event.preventDefault();
          this.fitToWindow();
        }
        break;
    }
  }

  // File Menu Actions
  newProject(): void {
    if (confirm('Create a new project? Unsaved changes will be lost.')) {
      this.timelineService = new AdvancedTimelineService();
      this.ngOnInit();
    }
  }

  openProject(): void {
    // Implement project opening
    console.log('Open project');
  }

  saveProject(): void {
    // Implement project saving
    console.log('Save project');
  }

  saveProjectAs(): void {
    // Implement save as
    console.log('Save project as');
  }

  importMedia(): void {
    this.fileInput.nativeElement.click();
  }

  exportProject(): void {
    // Implement export
    console.log('Export project');
  }

  // Edit Menu Actions
  undo(): void {
    this.timelineService.undo();
  }

  redo(): void {
    this.timelineService.redo();
  }

  cut(): void {
    // Implement cut
    console.log('Cut');
  }

  copy(): void {
    // Implement copy
    console.log('Copy');
  }

  paste(): void {
    // Implement paste
    console.log('Paste');
  }

  delete(): void {
    this.timelineService.deleteSelectedClips();
  }

  selectAll(): void {
    // Implement select all
    console.log('Select all');
  }

  // View Menu Actions
  togglePanel(panel: keyof typeof this.visiblePanels): void {
    this.visiblePanels[panel] = !this.visiblePanels[panel];
  }

  resetLayout(): void {
    this.visiblePanels = {
      media: true,
      effects: true,
      preview: true,
      timeline: true
    };
    this.activeLeftPanel = 'media';
    this.activeRightPanel = 'visualizer';
  }

  // Timeline Menu Actions
  addVideoTrack(): void {
    this.timelineService.addTrack('video');
  }

  addAudioTrack(): void {
    this.timelineService.addTrack('audio');
  }

  fitToWindow(): void {
    // Implement fit to window
    console.log('Fit to window');
  }

  zoomIn(): void {
    // Implement zoom in
    console.log('Zoom in');
  }

  zoomOut(): void {
    // Implement zoom out
    console.log('Zoom out');
  }

  // Tool Actions
  setTool(tool: string): void {
    this.timelineService.setActiveTool(tool as ToolType);
  }

  // Playback Controls
  togglePlayback(): void {
    this.timelineService.togglePlayback();
  }

  goToStart(): void {
    this.timelineService.setPlaybackPosition(0);
  }

  goToEnd(): void {
    this.timelineService.setPlaybackPosition(this.timeline.duration);
  }

  stepBackward(): void {
    const frameTime = 1 / this.timeline.fps;
    this.timelineService.setPlaybackPosition(this.playback.position - frameTime);
  }

  stepForward(): void {
    const frameTime = 1 / this.timeline.fps;
    this.timelineService.setPlaybackPosition(this.playback.position + frameTime);
  }

  // UI Actions
  toggleApiConsole(): void {
    this.activeRightPanel = this.activeRightPanel === 'console' ? 'visualizer' : 'console';
  }

  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // File Import
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

  // Utility Methods
  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * this.timeline.fps);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }

  getToolName(tool: ToolType): string {
    const toolNames = {
      [ToolType.SELECT]: 'Selection',
      [ToolType.RAZOR]: 'Razor',
      [ToolType.SLIP]: 'Slip',
      [ToolType.SLIDE]: 'Slide',
      [ToolType.ZOOM]: 'Zoom',
      [ToolType.HAND]: 'Hand',
      [ToolType.TEXT]: 'Text',
      [ToolType.SHAPE]: 'Shape'
    };
    return toolNames[tool] || 'Unknown';
  }

  getSelectionInfo(): string {
    if (this.selectedClips.length === 0) {
      return 'No selection';
    } else if (this.selectedClips.length === 1) {
      return '1 clip selected';
    } else {
      return `${this.selectedClips.length} clips selected`;
    }
  }
}