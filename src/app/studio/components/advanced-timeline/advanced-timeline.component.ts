import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, CdkDrag } from '@angular/cdk/drag-drop';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { AdvancedTimelineService } from '../../services/advanced-timeline.service';
import { 
  AdvancedTimeline, 
  Track, 
  Clip, 
  PlaybackState, 
  ToolType 
} from '../../models/advanced-studio.models';

@Component({
  selector: 'app-advanced-timeline',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="advanced-timeline" #timelineContainer>
      <!-- Timeline Header -->
      <div class="timeline-header">
        <!-- Toolbar -->
        <div class="timeline-toolbar">
          <div class="tool-group">
            <button 
              class="tool-btn"
              [class.active]="activeTool === 'select'"
              (click)="setTool('select')"
              title="Selection Tool (V)"
            >
              <i class="icon-cursor"></i>
            </button>
            <button 
              class="tool-btn"
              [class.active]="activeTool === 'razor'"
              (click)="setTool('razor')"
              title="Razor Tool (C)"
            >
              <i class="icon-scissors"></i>
            </button>
            <button 
              class="tool-btn"
              [class.active]="activeTool === 'slip'"
              (click)="setTool('slip')"
              title="Slip Tool"
            >
              <i class="icon-slip"></i>
            </button>
            <button 
              class="tool-btn"
              [class.active]="activeTool === 'zoom'"
              (click)="setTool('zoom')"
              title="Zoom Tool"
            >
              <i class="icon-zoom"></i>
            </button>
          </div>
          
          <div class="timeline-controls">
            <button class="btn btn-sm" (click)="addVideoTrack()">
              <i class="icon-plus"></i> Video
            </button>
            <button class="btn btn-sm" (click)="addAudioTrack()">
              <i class="icon-plus"></i> Audio
            </button>
            <button class="btn btn-sm" (click)="addMarker()">
              <i class="icon-marker"></i> Marker
            </button>
          </div>
          
          <div class="zoom-controls">
            <button class="btn btn-sm" (click)="zoomOut()">
              <i class="icon-zoom-out"></i>
            </button>
            <span class="zoom-level">{{ (timeline.zoom * 100) | number:'1.0-0' }}%</span>
            <button class="btn btn-sm" (click)="zoomIn()">
              <i class="icon-zoom-in"></i>
            </button>
            <button class="btn btn-sm" (click)="fitToWindow()">Fit</button>
          </div>
        </div>
        
        <!-- Time Ruler -->
        <div class="time-ruler-container">
          <div class="track-headers-spacer"></div>
          <div class="time-ruler" [style.width.px]="timelineWidth">
            <div 
              class="time-marker" 
              *ngFor="let marker of timeMarkers"
              [style.left.px]="marker.position"
            >
              <span class="time-label">{{ marker.time }}</span>
              <div class="marker-line"></div>
            </div>
            
            <!-- Playhead -->
            <div 
              class="playhead"
              [style.left.px]="playheadPosition"
              (mousedown)="startPlayheadDrag($event)"
            >
              <div class="playhead-line"></div>
              <div class="playhead-handle"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline Content -->
      <div class="timeline-content" #timelineContent>
        <div class="timeline-tracks">
          <!-- Track Headers -->
          <div class="track-headers">
            <div 
              class="track-header"
              *ngFor="let track of timeline.tracks; trackBy: trackById"
              [style.height.px]="track.height"
              [class]="'track-header-' + track.type"
            >
              <div class="track-controls">
                <button 
                  class="track-btn mute"
                  [class.active]="track.muted"
                  (click)="toggleTrackMute(track)"
                  title="Mute"
                >
                  M
                </button>
                <button 
                  class="track-btn solo"
                  [class.active]="track.solo"
                  (click)="toggleTrackSolo(track)"
                  title="Solo"
                >
                  S
                </button>
                <button 
                  class="track-btn lock"
                  [class.active]="track.locked"
                  (click)="toggleTrackLock(track)"
                  title="Lock"
                >
                  L
                </button>
                <button 
                  class="track-btn hide"
                  [class.active]="track.hidden"
                  (click)="toggleTrackVisibility(track)"
                  title="Hide"
                  *ngIf="track.type === 'video'"
                >
                  H
                </button>
              </div>
              
              <div class="track-info">
                <input 
                  class="track-name"
                  [(ngModel)]="track.name"
                  (blur)="updateTrackName(track)"
                />
                <div class="track-type">{{ track.type.toUpperCase() }}</div>
              </div>
              
              <div class="track-volume" *ngIf="track.type === 'audio'">
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1"
                  [(ngModel)]="track.volume"
                  (input)="updateTrackVolume(track)"
                  class="volume-slider"
                />
              </div>
              
              <button 
                class="track-remove"
                (click)="removeTrack(track.id)"
                title="Remove Track"
              >
                <i class="icon-trash"></i>
              </button>
            </div>
          </div>
          
          <!-- Track Content -->
          <div class="track-content-container" [style.width.px]="timelineWidth">
            <div 
              class="track-content"
              *ngFor="let track of timeline.tracks; trackBy: trackById"
              [style.height.px]="track.height"
              [class]="'track-' + track.type"
              cdkDropList
              [cdkDropListData]="{ trackId: track.id, type: track.type }"
              (cdkDropListDropped)="onClipDrop($event)"
            >
              <!-- Grid Lines -->
              <div class="track-grid" [style.width.px]="timelineWidth">
                <div 
                  class="grid-line"
                  *ngFor="let line of gridLines"
                  [style.left.px]="line"
                ></div>
              </div>
              
              <!-- Clips -->
              <div 
                class="clip"
                *ngFor="let clip of track.clips; trackBy: clipById"
                [class.selected]="clip.selected"
                [class]="'clip-' + clip.type"
                [style.left.px]="getClipPosition(clip)"
                [style.width.px]="getClipWidth(clip)"
                [style.background-color]="getClipColor(clip)"
                (click)="selectClip(clip, $event)"
                (dblclick)="editClip(clip)"
                cdkDrag
                [cdkDragData]="clip"
                [cdkDragDisabled]="track.locked || activeTool !== 'select'"
              >
                <!-- Clip Content -->
                <div class="clip-content">
                  <!-- Video Clip -->
                  <div class="clip-thumbnail" *ngIf="clip.type === 'video' && clip.thumbnail">
                    <img [src]="clip.thumbnail" [alt]="clip.name" />
                  </div>
                  
                  <!-- Audio Clip -->
                  <div class="clip-waveform" *ngIf="clip.type === 'audio' && clip.waveform">
                    <canvas 
                      #waveformCanvas
                      [width]="getClipWidth(clip)"
                      [height]="track.height - 8"
                    ></canvas>
                  </div>
                  
                  <!-- Text/Info -->
                  <div class="clip-info">
                    <div class="clip-name">{{ clip.name }}</div>
                    <div class="clip-duration" *ngIf="getClipWidth(clip) > 60">
                      {{ formatDuration(clip.duration) }}
                    </div>
                  </div>
                  
                  <!-- Effects Indicator -->
                  <div class="clip-effects" *ngIf="clip.effects.length > 0">
                    <i class="icon-effects"></i>
                  </div>
                </div>
                
                <!-- Clip Handles -->
                <div class="clip-handles" *ngIf="clip.selected && !track.locked">
                  <div 
                    class="clip-handle left"
                    (mousedown)="startTrimming(clip, 'in', $event)"
                  ></div>
                  <div 
                    class="clip-handle right"
                    (mousedown)="startTrimming(clip, 'out', $event)"
                  ></div>
                </div>
                
                <!-- Fade Handles -->
                <div class="fade-handles" *ngIf="clip.selected && !track.locked">
                  <div 
                    class="fade-handle fade-in"
                    [style.width.px]="getFadeWidth(clip.fadeIn)"
                    (mousedown)="startFadeAdjust(clip, 'in', $event)"
                  ></div>
                  <div 
                    class="fade-handle fade-out"
                    [style.width.px]="getFadeWidth(clip.fadeOut)"
                    (mousedown)="startFadeAdjust(clip, 'out', $event)"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Timeline Footer -->
      <div class="timeline-footer">
        <div class="timeline-info">
          <span>{{ formatTime(playback.position) }} / {{ formatTime(timeline.duration) }}</span>
          <span>{{ timeline.fps }} FPS</span>
          <span>{{ timeline.tracks.length }} Tracks</span>
          <span>{{ getTotalClips() }} Clips</span>
        </div>
        
        <div class="snap-controls">
          <button 
            class="snap-btn"
            [class.active]="timeline.settings.snapToGrid"
            (click)="toggleSnap('grid')"
            title="Snap to Grid"
          >
            <i class="icon-grid"></i>
          </button>
          <button 
            class="snap-btn"
            [class.active]="timeline.settings.snapToClips"
            (click)="toggleSnap('clips')"
            title="Snap to Clips"
          >
            <i class="icon-magnet"></i>
          </button>
          <button 
            class="snap-btn"
            [class.active]="timeline.settings.snapToMarkers"
            (click)="toggleSnap('markers')"
            title="Snap to Markers"
          >
            <i class="icon-marker"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./advanced-timeline.component.scss']
})
export class AdvancedTimelineComponent implements OnInit, OnDestroy {
  @ViewChild('timelineContainer') timelineContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('timelineContent') timelineContent!: ElementRef<HTMLDivElement>;

  timeline!: AdvancedTimeline;
  playback!: PlaybackState;
  activeTool: ToolType = ToolType.SELECT;
  selectedClips: string[] = [];

  timeMarkers: { time: string; position: number }[] = [];
  gridLines: number[] = [];
  timelineWidth = 2000;
  playheadPosition = 0;
  
  // Interaction state
  private isDraggingPlayhead = false;
  private isTrimming = false;
  private isAdjustingFade = false;
  private trimmingClip: Clip | null = null;
  private trimmingMode: 'in' | 'out' = 'in';
  private fadeClip: Clip | null = null;
  private fadeMode: 'in' | 'out' = 'in';

  private destroy$ = new Subject<void>();

  constructor(private timelineService: AdvancedTimelineService) {}

  ngOnInit(): void {
    // Subscribe to timeline changes
    combineLatest([
      this.timelineService.timeline$,
      this.timelineService.playback$,
      this.timelineService.activeTool$,
      this.timelineService.selectedClips$
    ]).pipe(takeUntil(this.destroy$))
    .subscribe(([timeline, playback, activeTool, selectedClips]) => {
      this.timeline = timeline;
      this.playback = playback;
      this.activeTool = activeTool;
      this.selectedClips = selectedClips;
      
      this.updateTimelineView();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDraggingPlayhead) {
      this.updatePlayheadPosition(event);
    } else if (this.isTrimming && this.trimmingClip) {
      this.updateTrimming(event);
    } else if (this.isAdjustingFade && this.fadeClip) {
      this.updateFade(event);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    this.isDraggingPlayhead = false;
    this.isTrimming = false;
    this.isAdjustingFade = false;
    this.trimmingClip = null;
    this.fadeClip = null;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement) return;

    switch (event.code) {
      case 'KeyV':
        if (!event.ctrlKey) {
          event.preventDefault();
          this.setTool('select');
        }
        break;
      case 'KeyC':
        if (!event.ctrlKey) {
          event.preventDefault();
          this.setTool('razor');
        }
        break;
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        this.timelineService.deleteSelectedClips();
        break;
      case 'Space':
        event.preventDefault();
        this.timelineService.togglePlayback();
        break;
    }
  }

  // Timeline View Updates
  private updateTimelineView(): void {
    this.calculateTimelineWidth();
    this.generateTimeMarkers();
    this.generateGridLines();
    this.updatePlayheadPosition();
  }

  private calculateTimelineWidth(): void {
    const pixelsPerSecond = this.timeline.zoom * 50;
    this.timelineWidth = Math.max(2000, this.timeline.duration * pixelsPerSecond);
  }

  private generateTimeMarkers(): void {
    this.timeMarkers = [];
    const pixelsPerSecond = this.timeline.zoom * 50;
    const interval = this.getTimeInterval();
    
    for (let time = 0; time <= this.timeline.duration; time += interval) {
      this.timeMarkers.push({
        time: this.formatTime(time),
        position: time * pixelsPerSecond
      });
    }
  }

  private generateGridLines(): void {
    this.gridLines = [];
    const pixelsPerSecond = this.timeline.zoom * 50;
    const interval = this.getTimeInterval();
    
    for (let time = 0; time <= this.timeline.duration; time += interval) {
      this.gridLines.push(time * pixelsPerSecond);
    }
  }

  private getTimeInterval(): number {
    const zoom = this.timeline.zoom;
    if (zoom > 2) return 1;
    if (zoom > 1) return 5;
    if (zoom > 0.5) return 10;
    return 30;
  }

  private updatePlayheadPosition(): void {
    const pixelsPerSecond = this.timeline.zoom * 50;
    this.playheadPosition = this.playback.position * pixelsPerSecond;
  }

  // Tool Management
  setTool(tool: string): void {
    this.timelineService.setActiveTool(tool as ToolType);
  }

  // Track Operations
  addVideoTrack(): void {
    this.timelineService.addTrack('video');
  }

  addAudioTrack(): void {
    this.timelineService.addTrack('audio');
  }

  removeTrack(trackId: string): void {
    if (confirm('Are you sure you want to remove this track?')) {
      this.timelineService.removeTrack(trackId);
    }
  }

  toggleTrackMute(track: Track): void {
    track.muted = !track.muted;
  }

  toggleTrackSolo(track: Track): void {
    track.solo = !track.solo;
    // If soloing, mute all other tracks of the same type
    if (track.solo) {
      this.timeline.tracks
        .filter(t => t.type === track.type && t.id !== track.id)
        .forEach(t => t.muted = true);
    }
  }

  toggleTrackLock(track: Track): void {
    track.locked = !track.locked;
  }

  toggleTrackVisibility(track: Track): void {
    track.hidden = !track.hidden;
  }

  updateTrackName(track: Track): void {
    // Track name updated via ngModel
  }

  updateTrackVolume(track: Track): void {
    // Track volume updated via ngModel
  }

  // Clip Operations
  selectClip(clip: Clip, event: MouseEvent): void {
    event.stopPropagation();
    this.timelineService.selectClip(clip.id, event.ctrlKey || event.metaKey);
  }

  editClip(clip: Clip): void {
    // Open clip properties panel
    console.log('Edit clip:', clip);
  }

  onClipDrop(event: CdkDragDrop<any>): void {
    const dragData = event.item.data;
    const dropData = event.container.data;
    
    if (dragData && dropData) {
      const rect = event.container.element.nativeElement.getBoundingClientRect();
      const dropX = event.dropPoint.x - rect.left;
      const pixelsPerSecond = this.timeline.zoom * 50;
      const newStart = dropX / pixelsPerSecond;
      
      if (dragData.id) {
        // Moving existing clip
        this.timelineService.moveClip(dragData.id, newStart, dropData.trackId);
      }
    }
  }

  // Trimming Operations
  startTrimming(clip: Clip, mode: 'in' | 'out', event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isTrimming = true;
    this.trimmingClip = clip;
    this.trimmingMode = mode;
  }

  private updateTrimming(event: MouseEvent): void {
    if (!this.trimmingClip || !this.timelineContainer) return;
    
    const rect = this.timelineContainer.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left - 200; // Account for track headers
    const pixelsPerSecond = this.timeline.zoom * 50;
    const time = x / pixelsPerSecond;
    
    if (this.trimmingMode === 'in') {
      const newIn = Math.max(0, time - this.trimmingClip.start);
      const maxIn = this.trimmingClip.duration - 0.1;
      this.timelineService.trimClip(
        this.trimmingClip.id, 
        Math.min(newIn, maxIn), 
        this.trimmingClip.out
      );
    } else {
      const newOut = Math.max(this.trimmingClip.in + 0.1, time - this.trimmingClip.start);
      this.timelineService.trimClip(
        this.trimmingClip.id, 
        this.trimmingClip.in, 
        newOut
      );
    }
  }

  // Fade Operations
  startFadeAdjust(clip: Clip, mode: 'in' | 'out', event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isAdjustingFade = true;
    this.fadeClip = clip;
    this.fadeMode = mode;
  }

  private updateFade(event: MouseEvent): void {
    if (!this.fadeClip || !this.timelineContainer) return;
    
    const rect = this.timelineContainer.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left - 200;
    const pixelsPerSecond = this.timeline.zoom * 50;
    const time = x / pixelsPerSecond;
    
    if (this.fadeMode === 'in') {
      this.fadeClip.fadeIn = Math.max(0, Math.min(time - this.fadeClip.start, this.fadeClip.duration / 2));
    } else {
      this.fadeClip.fadeOut = Math.max(0, Math.min(this.fadeClip.end - time, this.fadeClip.duration / 2));
    }
  }

  // Playhead Operations
  startPlayheadDrag(event: MouseEvent): void {
    event.preventDefault();
    this.isDraggingPlayhead = true;
  }

  private updatePlayheadPosition(event?: MouseEvent): void {
    if (event && this.timelineContainer) {
      const rect = this.timelineContainer.nativeElement.getBoundingClientRect();
      const x = event.clientX - rect.left - 200; // Account for track headers
      const pixelsPerSecond = this.timeline.zoom * 50;
      const time = Math.max(0, x / pixelsPerSecond);
      
      this.timelineService.setPlaybackPosition(time);
    } else {
      // Update visual position only
      const pixelsPerSecond = this.timeline.zoom * 50;
      this.playheadPosition = this.playback.position * pixelsPerSecond;
    }
  }

  // Zoom Operations
  zoomIn(): void {
    const newZoom = Math.min(this.timeline.zoom * 1.2, 10);
    this.timeline.zoom = newZoom;
    this.updateTimelineView();
  }

  zoomOut(): void {
    const newZoom = Math.max(this.timeline.zoom / 1.2, 0.1);
    this.timeline.zoom = newZoom;
    this.updateTimelineView();
  }

  fitToWindow(): void {
    if (this.timelineContent && this.timeline.duration > 0) {
      const containerWidth = this.timelineContent.nativeElement.clientWidth - 200;
      const optimalZoom = containerWidth / (this.timeline.duration * 50);
      this.timeline.zoom = Math.max(0.1, Math.min(optimalZoom, 2));
      this.updateTimelineView();
    }
  }

  // Snap Controls
  toggleSnap(type: 'grid' | 'clips' | 'markers'): void {
    switch (type) {
      case 'grid':
        this.timeline.settings.snapToGrid = !this.timeline.settings.snapToGrid;
        break;
      case 'clips':
        this.timeline.settings.snapToClips = !this.timeline.settings.snapToClips;
        break;
      case 'markers':
        this.timeline.settings.snapToMarkers = !this.timeline.settings.snapToMarkers;
        break;
    }
  }

  addMarker(): void {
    // Add marker at current playhead position
    console.log('Add marker at:', this.playback.position);
  }

  // Utility Methods
  getClipPosition(clip: Clip): number {
    const pixelsPerSecond = this.timeline.zoom * 50;
    return clip.start * pixelsPerSecond;
  }

  getClipWidth(clip: Clip): number {
    const pixelsPerSecond = this.timeline.zoom * 50;
    return Math.max(20, clip.duration * pixelsPerSecond);
  }

  getClipColor(clip: Clip): string {
    const colors = {
      video: '#4a90e2',
      audio: '#5cb85c',
      image: '#f0ad4e',
      text: '#d9534f'
    };
    return colors[clip.type] || '#6c757d';
  }

  getFadeWidth(fadeTime: number): number {
    const pixelsPerSecond = this.timeline.zoom * 50;
    return fadeTime * pixelsPerSecond;
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * this.timeline.fps);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  }

  formatDuration(seconds: number): string {
    return this.formatTime(seconds);
  }

  getTotalClips(): number {
    return this.timeline.tracks.reduce((total, track) => total + track.clips.length, 0);
  }

  trackById(index: number, track: Track): string {
    return track.id;
  }

  clipById(index: number, clip: Clip): string {
    return clip.id;
  }
}