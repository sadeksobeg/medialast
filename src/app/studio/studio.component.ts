import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MediaService } from '../proxy/medias/media.service';
import { MediaDto } from '../proxy/medias/models';
import { Router } from '@angular/router';

// Enhanced interfaces for professional video editing
interface Clip {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'effect' | 'transition';
  trackType: 'video' | 'audio';
  trackIndex: number;
  inPoint: number;
  outPoint: number;
  duration: number;
  startTime: number;
  endTime: number;
  src?: string;
  thumbnail?: string;
  mediaId?: string;
  
  // Video properties
  opacity?: number;
  scale?: number;
  rotation?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  lut?: string;
  
  // Audio properties
  volume?: number;
  pan?: number;
  pitch?: number;
  waveform?: number[];
  volumeEnvelope?: { time: number; value: number }[];
  
  // Effects and keyframes
  effects?: Effect[];
  keyframes?: Keyframe[];
}

interface Effect {
  id: string;
  name: string;
  type: string;
  thumbnail: string;
  category: 'color' | 'blur' | 'distortion' | 'artistic' | 'transition';
  parameters?: any;
}

interface Keyframe {
  id: string;
  time: number;
  property: string;
  value: any;
  easing?: string;
}

interface TitleTemplate {
  id: string;
  name: string;
  preview: string;
  style: any;
}

interface AudioTool {
  type: string;
  name: string;
  icon: string;
}

interface NavTab {
  id: string;
  label: string;
  icon: string;
}

interface TimeMarker {
  time: string;
  position: number;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Component({
  selector: 'app-studio',
  standalone: false,
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.scss'
})
export class StudioComponent implements OnInit {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  // UI State
  sidebarCollapsed: boolean = false;
  inspectorCollapsed: boolean = false;
  activeTab: string = 'media';
  
  // Navigation
  navTabs: NavTab[] = [
    { id: 'media', label: 'Media', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8,5.14V19.14L19,12.14L8,5.14Z"/></svg>' },
    { id: 'effects', label: 'Effects', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2Z"/></svg>' },
    { id: 'text', label: 'Text', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5,4L19.66,8.35L18.7,8.61C18.25,7.74 17.79,6.87 17.26,6.43C16.73,6 16.11,6 15.5,6H13V16.5C13,17 13,17.5 13.5,17.5H14V19H10V17.5H10.5C11,17.5 11,17 11,16.5V6H8.5C7.89,6 7.27,6 6.74,6.43C6.21,6.87 5.75,7.74 5.3,8.61L4.34,8.35L5.5,4H18.5Z"/></svg>' },
    { id: 'audio', label: 'Audio', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/></svg>' },
    { id: 'captions', label: 'Captions', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18,11H16.5V10.5C16.5,9.95 16.05,9.5 15.5,9.5C14.95,9.5 14.5,9.95 14.5,10.5V13.5C14.5,14.05 14.95,14.5 15.5,14.5C16.05,14.5 16.5,14.05 16.5,13.5V13H18V13.5A2.5,2.5 0 0,1 15.5,16A2.5,2.5 0 0,1 13,13.5V10.5A2.5,2.5 0 0,1 15.5,8A2.5,2.5 0 0,1 18,10.5V11M11,11H9.5V10.5C9.5,9.95 9.05,9.5 8.5,9.5C7.95,9.5 7.5,9.95 7.5,10.5V13.5C7.5,14.05 7.95,14.5 8.5,14.5C9.05,14.5 9.5,14.05 9.5,13.5V13H11V13.5A2.5,2.5 0 0,1 8.5,16A2.5,2.5 0 0,1 6,13.5V10.5A2.5,2.5 0 0,1 8.5,8A2.5,2.5 0 0,1 11,10.5V11M7,4A2,2 0 0,0 5,6V18A2,2 0 0,0 7,20H17A2,2 0 0,0 19,18V6A2,2 0 0,0 17,4H7Z"/></svg>' }
  ];

  // Search and filtering
  searchQuery: string = '';
  quickTags: string[] = ['blur', 'zoom', 'retro', 'shake', 'rainbow', 'voice', 'music'];

  // Project state
  currentProjectName: string = 'Untitled Project';
  
  // Media
  allMedia: MediaDto[] = [];
  filteredMedia: MediaDto[] = [];
  selectedMedia: MediaDto | null = null;
  selectedVideoForPreview: string = '';

  // Playback state
  isPlaying: boolean = false;
  currentTime: number = 0;
  totalDuration: number = 240;
  volume: number = 100;
  isMuted: boolean = false;
  playbackSpeed: number = 1;

  // Timeline state
  zoomLevel: number = 100;
  timelineZoom: number = 100;
  clips: Clip[] = [];
  selectedClip: Clip | null = null;
  videoTracks: number[] = [0, 1, 2];
  audioTracks: number[] = [0, 1, 2, 3];
  timeMarkers: TimeMarker[] = [];
  
  // Track states
  mutedTracks: { [key: string]: boolean } = {};
  soloTracks: { [key: string]: boolean } = {};
  trackVolumes: { [key: string]: number } = {};

  // Undo/Redo
  undoStack: Clip[][] = [];
  redoStack: Clip[][] = [];

  // Effects and templates
  videoEffects: Effect[] = [
    { id: '1', name: 'Blur', type: 'blur', thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', category: 'blur' },
    { id: '2', name: 'Sharpen', type: 'sharpen', thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', category: 'color' },
    { id: '3', name: 'Vintage', type: 'vintage', thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', category: 'artistic' },
    { id: '4', name: 'Glow', type: 'glow', thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', category: 'artistic' },
    { id: '5', name: 'Zoom', type: 'zoom', thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', category: 'distortion' },
    { id: '6', name: 'Shake', type: 'shake', thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', category: 'distortion' }
  ];

  titleTemplates: TitleTemplate[] = [
    { id: '1', name: 'Simple Title', preview: 'Title', style: { fontSize: '24px', color: '#fff' } },
    { id: '2', name: 'Subtitle', preview: 'Subtitle', style: { fontSize: '18px', color: '#ccc' } },
    { id: '3', name: 'Lower Third', preview: 'Name', style: { fontSize: '20px', color: '#fff', background: '#333' } }
  ];

  audioTools: AudioTool[] = [
    { type: 'extract-voice', name: 'Extract Voice', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/></svg>' },
    { type: 'remove-background', name: 'Remove BG Audio', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/></svg>' },
    { type: 'noise-reduction', name: 'Noise Reduction', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/></svg>' },
    { type: 'audio-mixer', name: 'Audio Mixer', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H7A2,2 0 0,0 9,19V5A2,2 0 0,0 7,3M7,19H5V5H7V19M12,3H10A2,2 0 0,0 8,5V19A2,2 0 0,0 10,21H12A2,2 0 0,0 14,19V5A2,2 0 0,0 12,3M12,19H10V5H12V19M19,3H17A2,2 0 0,0 15,5V19A2,2 0 0,0 17,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H17V5H19V19Z"/></svg>' }
  ];

  // Toast notifications
  toasts: Toast[] = [];

  constructor(
    private mediaService: MediaService,
    private router: Router
  ) {
    this.generateTimeMarkers();
    this.initializeTrackStates();
  }

  ngOnInit(): void {
    this.loadMedia();
    this.saveStateForUndo();
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
    if (tabId === 'media') {
      this.loadMedia();
    }
  }

  // Search and filtering
  onSearchChange(): void {
    this.filterMedia();
  }

  applyQuickTag(tag: string): void {
    this.searchQuery = tag;
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

  // Media management
  loadMedia(): void {
    this.mediaService.getList({
      maxResultCount: 100,
      skipCount: 0,
      sorting: 'title'
    }).subscribe({
      next: (response) => {
        this.allMedia = response.items?.filter(media => 
          media.video && media.video.trim() !== ''
        ) || [];
        this.filterMedia();
        this.showToast('Media loaded successfully', 'success');
      },
      error: (error) => {
        console.error('Failed to load media:', error);
        this.showToast('Failed to load media', 'error');
      }
    });
  }

  refreshMedia(): void {
    this.loadMedia();
  }

  selectMedia(media: MediaDto): void {
    this.selectedMedia = media;
    this.selectedVideoForPreview = media.video || '';
    this.showToast(`Selected: ${media.title}`, 'info');
  }

  openImportDialog(): void {
    this.router.navigate(['/media/create']);
  }

  // Playback controls
  togglePlayPause(): void {
    this.isPlaying = !this.isPlaying;
    if (this.videoPlayer?.nativeElement) {
      if (this.isPlaying) {
        this.videoPlayer.nativeElement.play();
      } else {
        this.videoPlayer.nativeElement.pause();
      }
    }
  }

  seekTo(event: MouseEvent): void {
    if (this.videoPlayer?.nativeElement) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const percent = (event.clientX - rect.left) / rect.width;
      const newTime = percent * this.totalDuration;
      this.videoPlayer.nativeElement.currentTime = newTime;
      this.currentTime = newTime;
    }
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.muted = this.isMuted;
    }
  }

  setVolume(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.volume = parseInt(target.value);
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.volume = this.volume / 100;
    }
  }

  setPlaybackSpeed(): void {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.playbackRate = this.playbackSpeed;
    }
  }

  onVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.totalDuration = video.duration || 240;
    this.generateTimeMarkers();
  }

  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.currentTime = video.currentTime;
  }

  // Timeline controls
  zoomIn(): void {
    if (this.zoomLevel < 400) {
      this.zoomLevel += 25;
      this.showToast(`Zoomed in to ${this.zoomLevel}%`, 'info');
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > 25) {
      this.zoomLevel -= 25;
      this.showToast(`Zoomed out to ${this.zoomLevel}%`, 'info');
    }
  }

  onTimelineZoomChange(): void {
    this.generateTimeMarkers();
  }

  fitToWindow(): void {
    this.timelineZoom = 100;
    this.generateTimeMarkers();
    this.showToast('Timeline fitted to window', 'info');
  }

  private generateTimeMarkers(): void {
    const markerCount = Math.max(5, Math.floor(this.totalDuration / 30));
    const interval = this.totalDuration / (markerCount - 1);
    
    this.timeMarkers = Array.from({ length: markerCount }, (_, i) => ({
      time: this.formatTime(i * interval),
      position: (i / (markerCount - 1)) * 100
    }));
  }

  // Track management
  private initializeTrackStates(): void {
    [...this.videoTracks, ...this.audioTracks].forEach(trackIndex => {
      const videoKey = `video-${trackIndex}`;
      const audioKey = `audio-${trackIndex}`;
      
      this.mutedTracks[videoKey] = false;
      this.mutedTracks[audioKey] = false;
      this.soloTracks[videoKey] = false;
      this.soloTracks[audioKey] = false;
      this.trackVolumes[videoKey] = 100;
      this.trackVolumes[audioKey] = 100;
    });
  }

  isTrackMuted(type: 'video' | 'audio', trackIndex: number): boolean {
    return this.mutedTracks[`${type}-${trackIndex}`] || false;
  }

  isTrackSolo(type: 'video' | 'audio', trackIndex: number): boolean {
    return this.soloTracks[`${type}-${trackIndex}`] || false;
  }

  getTrackVolume(type: 'video' | 'audio', trackIndex: number): number {
    return this.trackVolumes[`${type}-${trackIndex}`] || 100;
  }

  toggleTrackMute(type: 'video' | 'audio', trackIndex: number): void {
    const key = `${type}-${trackIndex}`;
    this.mutedTracks[key] = !this.mutedTracks[key];
    this.showToast(`Track ${type} ${trackIndex + 1} ${this.mutedTracks[key] ? 'muted' : 'unmuted'}`, 'info');
  }

  toggleTrackSolo(type: 'video' | 'audio', trackIndex: number): void {
    const key = `${type}-${trackIndex}`;
    this.soloTracks[key] = !this.soloTracks[key];
    this.showToast(`Track ${type} ${trackIndex + 1} ${this.soloTracks[key] ? 'soloed' : 'unsoloed'}`, 'info');
  }

  setTrackVolume(type: 'video' | 'audio', trackIndex: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const key = `${type}-${trackIndex}`;
    this.trackVolumes[key] = parseInt(target.value);
  }

  // Clip management
  getClipsForTrack(type: 'video' | 'audio', trackIndex: number): Clip[] {
    return this.clips
      .filter(clip => clip.trackType === type && clip.trackIndex === trackIndex)
      .sort((a, b) => a.startTime - b.startTime);
  }

  selectClip(clip: Clip): void {
    this.selectedClip = clip;
    this.showToast(`Selected: ${clip.name}`, 'info');
  }

  editClip(clip: Clip): void {
    this.showToast(`Editing: ${clip.name}`, 'info');
    // Open clip editor modal or inline editor
  }

  splitClip(clip: Clip, time: number): void {
    if (time > clip.startTime && time < clip.endTime) {
      this.saveStateForUndo();
      
      const firstClip: Clip = {
        ...clip,
        id: `${clip.id}_part1`,
        endTime: time,
        duration: time - clip.startTime
      };
      
      const secondClip: Clip = {
        ...clip,
        id: `${clip.id}_part2`,
        startTime: time,
        duration: clip.endTime - time
      };
      
      const clipIndex = this.clips.findIndex(c => c.id === clip.id);
      this.clips.splice(clipIndex, 1, firstClip, secondClip);
      
      this.showToast(`Clip split at ${this.formatTime(time)}`, 'success');
    }
  }

  onClipDrop(event: CdkDragDrop<any>): void {
    const dragData = event.item.data;
    const dropData = event.container.data;
    
    if (dragData.type === 'video' && dragData.media) {
      this.addMediaToTimeline(dragData.media, dropData.type, dropData.index);
    } else if (dragData.type === 'effect') {
      this.applyEffect(dragData);
    }
  }

  private addMediaToTimeline(media: MediaDto, trackType: 'video' | 'audio', trackIndex: number): void {
    this.saveStateForUndo();
    
    const newClip: Clip = {
      id: `${trackType}-${Date.now()}`,
      name: media.title || 'Untitled',
      type: trackType,
      trackType: trackType,
      trackIndex: trackIndex,
      inPoint: 0,
      outPoint: 30,
      duration: 30,
      startTime: this.findNextAvailableTime(trackType, trackIndex),
      endTime: 0,
      src: media.video || '',
      thumbnail: media.video || '',
      mediaId: media.id,
      opacity: 100,
      scale: 100,
      rotation: 0,
      brightness: 0,
      contrast: 0,
      saturation: 0,
      volume: 100,
      pan: 0,
      pitch: 0,
      effects: [],
      keyframes: []
    };
    
    newClip.endTime = newClip.startTime + newClip.duration;
    this.clips.push(newClip);
    this.showToast(`Added "${media.title}" to timeline`, 'success');
  }

  private findNextAvailableTime(trackType: 'video' | 'audio', trackIndex: number): number {
    const trackClips = this.getClipsForTrack(trackType, trackIndex);
    if (trackClips.length === 0) return 0;
    
    const lastClip = trackClips[trackClips.length - 1];
    return lastClip.endTime;
  }

  getClipPosition(clip: Clip): number {
    return (clip.startTime / this.totalDuration) * (this.timelineZoom / 100) * 1000;
  }

  getClipWidth(clip: Clip): number {
    return (clip.duration / this.totalDuration) * (this.timelineZoom / 100) * 1000;
  }

  getPlayheadPosition(): number {
    return (this.currentTime / this.totalDuration) * (this.timelineZoom / 100) * 1000;
  }

  // Resize and trim operations
  startResize(event: MouseEvent, clip: Clip, handle: 'start' | 'end'): void {
    event.preventDefault();
    event.stopPropagation();
    this.showToast(`Resizing ${clip.name}`, 'info');
    // Implement resize logic
  }

  startTrim(event: MouseEvent, clip: Clip, point: 'in' | 'out'): void {
    event.preventDefault();
    event.stopPropagation();
    this.showToast(`Trimming ${clip.name}`, 'info');
    // Implement trim logic
  }

  startPlayheadDrag(event: MouseEvent): void {
    event.preventDefault();
    // Implement playhead dragging
  }

  // Effects and tools
  applyEffect(effect: Effect): void {
    if (this.selectedClip) {
      this.saveStateForUndo();
      if (!this.selectedClip.effects) {
        this.selectedClip.effects = [];
      }
      this.selectedClip.effects.push(effect);
      this.showToast(`Applied ${effect.name} effect`, 'success');
    } else {
      this.showToast('Please select a clip first', 'warning');
    }
  }

  removeEffect(effect: Effect): void {
    if (this.selectedClip && this.selectedClip.effects) {
      const index = this.selectedClip.effects.findIndex(e => e.id === effect.id);
      if (index !== -1) {
        this.selectedClip.effects.splice(index, 1);
        this.showToast(`Removed ${effect.name} effect`, 'success');
      }
    }
  }

  addTextElement(template: TitleTemplate): void {
    this.saveStateForUndo();
    
    const textClip: Clip = {
      id: `text-${Date.now()}`,
      name: template.name,
      type: 'text',
      trackType: 'video',
      trackIndex: 1,
      inPoint: 0,
      outPoint: 5,
      duration: 5,
      startTime: this.currentTime,
      endTime: this.currentTime + 5,
      effects: [],
      keyframes: []
    };
    
    this.clips.push(textClip);
    this.showToast(`Added ${template.name} text`, 'success');
  }

  // Audio tools
  openAudioTool(toolType: string): void {
    const tool = this.audioTools.find(t => t.type === toolType);
    if (tool) {
      this.showToast(`Opening ${tool.name}...`, 'info');
      // Implement audio tool logic
    }
  }

  extractAudio(): void {
    if (this.selectedClip && this.selectedClip.type === 'video') {
      this.saveStateForUndo();
      
      const audioClip: Clip = {
        ...this.selectedClip,
        id: `audio_${this.selectedClip.id}`,
        name: `${this.selectedClip.name} (Audio)`,
        type: 'audio',
        trackType: 'audio',
        trackIndex: 0
      };
      
      this.clips.push(audioClip);
      this.showToast(`Audio extracted from ${this.selectedClip.name}`, 'success');
    }
  }

  takeSnapshot(): void {
    if (this.videoPlayer?.nativeElement) {
      const canvas = document.createElement('canvas');
      const video = this.videoPlayer.nativeElement;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `snapshot-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
            this.showToast('Snapshot saved', 'success');
          }
        });
      }
    }
  }

  // Caption tools
  generateAutoCaption(): void {
    this.showToast('Generating automatic captions...', 'info');
    // Simulate AI caption generation
    setTimeout(() => {
      this.showToast('Captions generated successfully!', 'success');
    }, 3000);
  }

  importSubtitles(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.srt,.vtt,.ass';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        this.showToast(`Importing subtitles from ${file.name}...`, 'info');
        setTimeout(() => {
          this.showToast('Subtitles imported successfully!', 'success');
        }, 1500);
      }
    };
    input.click();
  }

  smartCut(): void {
    this.showToast('Analyzing audio for smart cuts...', 'info');
    setTimeout(() => {
      this.showToast('Smart cuts applied successfully!', 'success');
    }, 2500);
  }

  // Keyframe management
  editKeyframe(keyframe: Keyframe, event: MouseEvent): void {
    event.stopPropagation();
    this.showToast(`Editing keyframe at ${this.formatTime(keyframe.time)}`, 'info');
  }

  getVolumeEnvelopePoints(clip: Clip): string {
    if (!clip.volumeEnvelope) return '';
    
    return clip.volumeEnvelope
      .map(point => `${(point.time / clip.duration) * 100},${20 - (point.value / 100) * 20}`)
      .join(' ');
  }

  showClipContextMenu(event: MouseEvent, clip: Clip): void {
    event.preventDefault();
    this.selectClip(clip);
    // Show context menu
  }

  // Project management
  shareProject(): void {
    const shareUrl = `${window.location.origin}/studio?project=${Date.now()}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      this.showToast('Share link copied to clipboard!', 'success');
    }).catch(() => {
      this.showToast('Failed to copy share link', 'error');
    });
  }

  openSettings(): void {
    this.showToast('Opening project settings...', 'info');
  }

  openExportModal(): void {
    this.showToast('Opening export settings...', 'info');
  }

  // Undo/Redo
  undo(): void {
    if (this.undoStack.length > 1) {
      this.redoStack.push([...this.clips]);
      this.undoStack.pop();
      this.clips = [...this.undoStack[this.undoStack.length - 1]];
      this.showToast('Undid last action', 'info');
    }
  }

  redo(): void {
    if (this.redoStack.length > 0) {
      this.undoStack.push([...this.clips]);
      this.clips = [...this.redoStack.pop()!];
      this.showToast('Redid last action', 'info');
    }
  }

  get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  private saveStateForUndo(): void {
    this.undoStack.push([...this.clips]);
    this.redoStack = [];
    
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  // Utility methods
  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getLanguageName(languageCode?: string): string {
    const languageMap: { [key: string]: string } = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
      'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi'
    };
    
    if (!languageCode) return 'Not specified';
    return languageMap[languageCode] || languageCode;
  }

  trackByIndex(index: number): number {
    return index;
  }

  get formattedCurrentTime(): string {
    return this.formatTime(this.currentTime);
  }

  get formattedTotalDuration(): string {
    return this.formatTime(this.totalDuration);
  }

  // Toast notifications
  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    const toast: Toast = {
      id: Date.now().toString(),
      message,
      type
    };
    
    this.toasts.push(toast);
    
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== toast.id);
    }, 4000);
  }
}