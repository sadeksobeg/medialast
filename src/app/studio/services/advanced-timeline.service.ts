import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { 
  AdvancedTimeline, 
  Track, 
  Clip, 
  PlaybackState, 
  ViewportState,
  UndoRedoState,
  EditOperation,
  OperationType,
  ToolType,
  Tool
} from '../models/advanced-studio.models';

@Injectable({
  providedIn: 'root'
})
export class AdvancedTimelineService {
  private timelineSubject = new BehaviorSubject<AdvancedTimeline>(this.createDefaultTimeline());
  private playbackSubject = new BehaviorSubject<PlaybackState>(this.createDefaultPlayback());
  private viewportSubject = new BehaviorSubject<ViewportState>(this.createDefaultViewport());
  private undoRedoSubject = new BehaviorSubject<UndoRedoState>(this.createDefaultUndoRedo());
  private selectedClipsSubject = new BehaviorSubject<string[]>([]);
  private activeToolSubject = new BehaviorSubject<ToolType>(ToolType.SELECT);
  
  private operationHistory: EditOperation[] = [];
  private currentHistoryIndex = -1;
  private maxHistorySize = 100;
  
  // Observables
  timeline$ = this.timelineSubject.asObservable();
  playback$ = this.playbackSubject.asObservable();
  viewport$ = this.viewportSubject.asObservable();
  undoRedo$ = this.undoRedoSubject.asObservable();
  selectedClips$ = this.selectedClipsSubject.asObservable();
  activeTool$ = this.activeToolSubject.asObservable();
  
  // Events
  private clipAddedSubject = new Subject<Clip>();
  private clipRemovedSubject = new Subject<string>();
  private clipUpdatedSubject = new Subject<Clip>();
  
  clipAdded$ = this.clipAddedSubject.asObservable();
  clipRemoved$ = this.clipRemovedSubject.asObservable();
  clipUpdated$ = this.clipUpdatedSubject.asObservable();

  constructor() {
    this.initializeDefaultTracks();
  }

  // Timeline Management
  private createDefaultTimeline(): AdvancedTimeline {
    return {
      id: this.generateId(),
      name: 'Untitled Project',
      fps: 30,
      width: 1920,
      height: 1080,
      sampleRate: 48000,
      channels: 2,
      duration: 0,
      position: 0,
      scale: 1,
      zoom: 1,
      tracks: [],
      markers: [],
      keyframes: [],
      settings: {
        snapToGrid: true,
        snapToClips: true,
        snapToMarkers: true,
        magneticTimeline: true,
        autoSave: true,
        autoSaveInterval: 300000, // 5 minutes
        previewQuality: 'auto' as any,
        audioScrubbing: true,
        showWaveforms: true,
        showThumbnails: true
      }
    };
  }

  private createDefaultPlayback(): PlaybackState {
    return {
      playing: false,
      position: 0,
      speed: 1,
      loop: false,
      volume: 1,
      muted: false,
      quality: 'auto' as any
    };
  }

  private createDefaultViewport(): ViewportState {
    return {
      zoom: 1,
      panX: 0,
      panY: 0,
      showGrid: false,
      showSafeAreas: false,
      showRulers: true,
      aspectRatio: '16:9',
      backgroundColor: '#000000'
    };
  }

  private createDefaultUndoRedo(): UndoRedoState {
    return {
      canUndo: false,
      canRedo: false,
      currentIndex: -1,
      maxStates: this.maxHistorySize,
      description: ''
    };
  }

  private initializeDefaultTracks(): void {
    const timeline = this.timelineSubject.value;
    
    // Create default video tracks
    for (let i = 0; i < 3; i++) {
      const track: Track = {
        id: this.generateId(),
        type: 'video',
        name: `Video ${i + 1}`,
        index: i,
        height: 80,
        locked: false,
        muted: false,
        hidden: false,
        solo: false,
        color: this.getTrackColor('video', i),
        clips: [],
        effects: [],
        volume: 1,
        pan: 0
      };
      timeline.tracks.push(track);
    }

    // Create default audio tracks
    for (let i = 0; i < 4; i++) {
      const track: Track = {
        id: this.generateId(),
        type: 'audio',
        name: `Audio ${i + 1}`,
        index: i + 3,
        height: 60,
        locked: false,
        muted: false,
        hidden: false,
        solo: false,
        color: this.getTrackColor('audio', i),
        clips: [],
        effects: [],
        volume: 1,
        pan: 0
      };
      timeline.tracks.push(track);
    }

    this.timelineSubject.next(timeline);
  }

  // Track Operations
  addTrack(type: 'video' | 'audio' | 'subtitle' | 'overlay', name?: string): void {
    const timeline = this.timelineSubject.value;
    const tracksOfType = timeline.tracks.filter(t => t.type === type);
    const index = timeline.tracks.length;
    
    const track: Track = {
      id: this.generateId(),
      type,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${tracksOfType.length + 1}`,
      index,
      height: type === 'video' ? 80 : 60,
      locked: false,
      muted: false,
      hidden: false,
      solo: false,
      color: this.getTrackColor(type, tracksOfType.length),
      clips: [],
      effects: [],
      volume: 1,
      pan: 0
    };

    timeline.tracks.push(track);
    this.timelineSubject.next(timeline);
    
    this.addToHistory({
      id: this.generateId(),
      type: OperationType.ADD_TRACK,
      timestamp: Date.now(),
      data: { track },
      description: `Add ${type} track`
    });
  }

  removeTrack(trackId: string): void {
    const timeline = this.timelineSubject.value;
    const trackIndex = timeline.tracks.findIndex(t => t.id === trackId);
    
    if (trackIndex >= 0) {
      const removedTrack = timeline.tracks.splice(trackIndex, 1)[0];
      
      // Remove clips from selection if they were on this track
      const selectedClips = this.selectedClipsSubject.value;
      const updatedSelection = selectedClips.filter(clipId => 
        !removedTrack.clips.some(clip => clip.id === clipId)
      );
      this.selectedClipsSubject.next(updatedSelection);
      
      this.timelineSubject.next(timeline);
      
      this.addToHistory({
        id: this.generateId(),
        type: OperationType.REMOVE_TRACK,
        timestamp: Date.now(),
        data: { track: removedTrack, index: trackIndex },
        description: `Remove ${removedTrack.type} track`
      });
    }
  }

  // Clip Operations
  addClip(clip: Clip, trackId: string): void {
    const timeline = this.timelineSubject.value;
    const track = timeline.tracks.find(t => t.id === trackId);
    
    if (track && !track.locked) {
      // Ensure clip doesn't overlap with existing clips
      const adjustedClip = this.adjustClipPosition(clip, track);
      track.clips.push(adjustedClip);
      track.clips.sort((a, b) => a.start - b.start);
      
      this.updateTimelineDuration();
      this.timelineSubject.next(timeline);
      this.clipAddedSubject.next(adjustedClip);
      
      this.addToHistory({
        id: this.generateId(),
        type: OperationType.ADD_CLIP,
        timestamp: Date.now(),
        data: { clip: adjustedClip, trackId },
        description: `Add clip ${adjustedClip.name}`
      });
    }
  }

  removeClip(clipId: string): void {
    const timeline = this.timelineSubject.value;
    
    for (const track of timeline.tracks) {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex >= 0) {
        const removedClip = track.clips.splice(clipIndex, 1)[0];
        
        // Remove from selection
        const selectedClips = this.selectedClipsSubject.value;
        const updatedSelection = selectedClips.filter(id => id !== clipId);
        this.selectedClipsSubject.next(updatedSelection);
        
        this.updateTimelineDuration();
        this.timelineSubject.next(timeline);
        this.clipRemovedSubject.next(clipId);
        
        this.addToHistory({
          id: this.generateId(),
          type: OperationType.REMOVE_CLIP,
          timestamp: Date.now(),
          data: { clip: removedClip, trackId: track.id, index: clipIndex },
          description: `Remove clip ${removedClip.name}`
        });
        break;
      }
    }
  }

  moveClip(clipId: string, newStart: number, newTrackId?: string): void {
    const timeline = this.timelineSubject.value;
    let clip: Clip | null = null;
    let oldTrackId: string = '';
    
    // Find and remove clip from current track
    for (const track of timeline.tracks) {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex >= 0) {
        clip = track.clips.splice(clipIndex, 1)[0];
        oldTrackId = track.id;
        break;
      }
    }
    
    if (clip) {
      const oldStart = clip.start;
      clip.start = Math.max(0, newStart);
      clip.end = clip.start + clip.duration;
      
      // Add to new track or back to original
      const targetTrackId = newTrackId || oldTrackId;
      const targetTrack = timeline.tracks.find(t => t.id === targetTrackId);
      
      if (targetTrack && !targetTrack.locked) {
        const adjustedClip = this.adjustClipPosition(clip, targetTrack);
        targetTrack.clips.push(adjustedClip);
        targetTrack.clips.sort((a, b) => a.start - b.start);
        
        this.updateTimelineDuration();
        this.timelineSubject.next(timeline);
        this.clipUpdatedSubject.next(adjustedClip);
        
        this.addToHistory({
          id: this.generateId(),
          type: OperationType.MOVE_CLIP,
          timestamp: Date.now(),
          data: { 
            clipId, 
            oldStart, 
            newStart: adjustedClip.start, 
            oldTrackId, 
            newTrackId: targetTrackId 
          },
          description: `Move clip ${clip.name}`
        });
      }
    }
  }

  trimClip(clipId: string, newIn: number, newOut: number): void {
    const timeline = this.timelineSubject.value;
    
    for (const track of timeline.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        const oldIn = clip.in;
        const oldOut = clip.out;
        const oldDuration = clip.duration;
        
        clip.in = Math.max(0, newIn);
        clip.out = Math.min(clip.out, newOut);
        clip.duration = clip.out - clip.in;
        clip.end = clip.start + clip.duration;
        
        this.updateTimelineDuration();
        this.timelineSubject.next(timeline);
        this.clipUpdatedSubject.next(clip);
        
        this.addToHistory({
          id: this.generateId(),
          type: OperationType.TRIM_CLIP,
          timestamp: Date.now(),
          data: { clipId, oldIn, oldOut, oldDuration, newIn, newOut },
          description: `Trim clip ${clip.name}`
        });
        break;
      }
    }
  }

  splitClip(clipId: string, splitTime: number): void {
    const timeline = this.timelineSubject.value;
    
    for (const track of timeline.tracks) {
      const clipIndex = track.clips.findIndex(c => c.id === clipId);
      if (clipIndex >= 0) {
        const originalClip = track.clips[clipIndex];
        
        if (splitTime > originalClip.start && splitTime < originalClip.end) {
          // Create second part
          const secondClip: Clip = {
            ...originalClip,
            id: this.generateId(),
            start: splitTime,
            in: originalClip.in + (splitTime - originalClip.start),
            duration: originalClip.end - splitTime,
            end: originalClip.end
          };
          
          // Update first part
          originalClip.duration = splitTime - originalClip.start;
          originalClip.out = originalClip.in + originalClip.duration;
          originalClip.end = splitTime;
          
          // Insert second clip
          track.clips.splice(clipIndex + 1, 0, secondClip);
          
          this.timelineSubject.next(timeline);
          this.clipUpdatedSubject.next(originalClip);
          this.clipAddedSubject.next(secondClip);
          
          this.addToHistory({
            id: this.generateId(),
            type: OperationType.SPLIT_CLIP,
            timestamp: Date.now(),
            data: { originalClipId: clipId, secondClipId: secondClip.id, splitTime },
            description: `Split clip ${originalClip.name}`
          });
        }
        break;
      }
    }
  }

  // Selection Management
  selectClip(clipId: string, multiSelect: boolean = false): void {
    const selectedClips = this.selectedClipsSubject.value;
    
    if (multiSelect) {
      const index = selectedClips.indexOf(clipId);
      if (index >= 0) {
        selectedClips.splice(index, 1);
      } else {
        selectedClips.push(clipId);
      }
    } else {
      selectedClips.length = 0;
      selectedClips.push(clipId);
    }
    
    this.selectedClipsSubject.next([...selectedClips]);
    this.updateClipSelection();
  }

  selectClips(clipIds: string[]): void {
    this.selectedClipsSubject.next([...clipIds]);
    this.updateClipSelection();
  }

  clearSelection(): void {
    this.selectedClipsSubject.next([]);
    this.updateClipSelection();
  }

  deleteSelectedClips(): void {
    const selectedClips = this.selectedClipsSubject.value;
    selectedClips.forEach(clipId => this.removeClip(clipId));
    this.clearSelection();
  }

  // Playback Control
  setPlaybackPosition(position: number): void {
    const playback = this.playbackSubject.value;
    const timeline = this.timelineSubject.value;
    
    playback.position = Math.max(0, Math.min(position, timeline.duration));
    timeline.position = playback.position;
    
    this.playbackSubject.next(playback);
    this.timelineSubject.next(timeline);
  }

  togglePlayback(): void {
    const playback = this.playbackSubject.value;
    playback.playing = !playback.playing;
    this.playbackSubject.next(playback);
  }

  setPlaybackSpeed(speed: number): void {
    const playback = this.playbackSubject.value;
    playback.speed = Math.max(0.1, Math.min(4, speed));
    this.playbackSubject.next(playback);
  }

  // Tool Management
  setActiveTool(tool: ToolType): void {
    this.activeToolSubject.next(tool);
  }

  // Undo/Redo
  undo(): void {
    if (this.canUndo()) {
      this.currentHistoryIndex--;
      this.applyHistoryState();
      this.updateUndoRedoState();
    }
  }

  redo(): void {
    if (this.canRedo()) {
      this.currentHistoryIndex++;
      this.applyHistoryState();
      this.updateUndoRedoState();
    }
  }

  canUndo(): boolean {
    return this.currentHistoryIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentHistoryIndex < this.operationHistory.length - 1;
  }

  // Utility Methods
  private adjustClipPosition(clip: Clip, track: Track): Clip {
    // Check for overlaps and adjust position if needed
    const overlappingClip = track.clips.find(c => 
      c.id !== clip.id && 
      ((clip.start >= c.start && clip.start < c.end) ||
       (clip.end > c.start && clip.end <= c.end) ||
       (clip.start <= c.start && clip.end >= c.end))
    );
    
    if (overlappingClip) {
      // Move clip to end of overlapping clip
      clip.start = overlappingClip.end;
      clip.end = clip.start + clip.duration;
    }
    
    return clip;
  }

  private updateTimelineDuration(): void {
    const timeline = this.timelineSubject.value;
    let maxDuration = 0;
    
    timeline.tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.end > maxDuration) {
          maxDuration = clip.end;
        }
      });
    });
    
    timeline.duration = Math.max(maxDuration, 60); // Minimum 1 minute
  }

  private updateClipSelection(): void {
    const timeline = this.timelineSubject.value;
    const selectedClips = this.selectedClipsSubject.value;
    
    timeline.tracks.forEach(track => {
      track.clips.forEach(clip => {
        clip.selected = selectedClips.includes(clip.id);
      });
    });
    
    this.timelineSubject.next(timeline);
  }

  private addToHistory(operation: EditOperation): void {
    // Remove any operations after current index
    this.operationHistory = this.operationHistory.slice(0, this.currentHistoryIndex + 1);
    
    // Add new operation
    this.operationHistory.push(operation);
    this.currentHistoryIndex++;
    
    // Limit history size
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory.shift();
      this.currentHistoryIndex--;
    }
    
    this.updateUndoRedoState();
  }

  private applyHistoryState(): void {
    // This would implement the actual undo/redo logic
    // For now, we'll just update the state
    this.updateUndoRedoState();
  }

  private updateUndoRedoState(): void {
    const undoRedo = this.undoRedoSubject.value;
    undoRedo.canUndo = this.canUndo();
    undoRedo.canRedo = this.canRedo();
    undoRedo.currentIndex = this.currentHistoryIndex;
    undoRedo.description = this.currentHistoryIndex >= 0 ? 
      this.operationHistory[this.currentHistoryIndex]?.description || '' : '';
    
    this.undoRedoSubject.next(undoRedo);
  }

  private getTrackColor(type: string, index: number): string {
    const colors = {
      video: ['#4a90e2', '#5cb85c', '#f0ad4e', '#d9534f'],
      audio: ['#5bc0de', '#5cb85c', '#f0ad4e', '#d9534f'],
      subtitle: ['#6f42c1', '#e83e8c'],
      overlay: ['#fd7e14', '#20c997']
    };
    
    const colorArray = colors[type as keyof typeof colors] || colors.video;
    return colorArray[index % colorArray.length];
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}