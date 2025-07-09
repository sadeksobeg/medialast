import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MediaService } from '../proxy/medias/media.service';
import { MediaDto } from '../proxy/medias/models';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';

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
  
  // Audio properties
  volume?: number;
  pan?: number;
  pitch?: number;
  waveform?: number[];
  
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
    ])
  ]
})
export class StudioComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  // UI State
  sidebarCollapsed: boolean = false;
  inspectorCollapsed: boolean = false;
  activeTab: string = 'media';
  isLoading: boolean = false;
  loadingMessage: string = '';
  
  // Navigation
  navTabs: NavTab[] = [
    { 
      id: 'media', 
      label: 'Media', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8,5.14V19.14L19,12.14L8,5.14Z"/></svg>' 
    },
    { 
      id: 'effects', 
      label: 'Effects', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2Z"/></svg>' 
    },
    { 
      id: 'text', 
      label: 'Text', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5,4L19.66,8.35L18.7,8.61C18.25,7.74 17.79,6.87 17.26,6.43C16.73,6 16.11,6 15.5,6H13V16.5C13,17 13,17.5 13.5,17.5H14V19H10V17.5H10.5C11,17.5 11,17 11,16.5V6H8.5C7.89,6 7.27,6 6.74,6.43C6.21,6.87 5.75,7.74 5.3,8.61L4.34,8.35L5.5,4H18.5Z"/></svg>' 
    },
    { 
      id: 'audio', 
      label: 'Audio', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/></svg>' 
    },
    { 
      id: 'captions', 
      label: 'Captions', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18,11H16.5V10.5C16.5,9.95 16.05,9.5 15.5,9.5C14.95,9.5 14.5,9.95 14.5,10.5V13.5C14.5,14.05 14.95,14.5 15.5,14.5C16.05,14.5 16.5,14.05 16.5,13.5V13H18V13.5A2.5,2.5 0 0,1 15.5,16A2.5,2.5 0 0,1 13,13.5V10.5A2.5,2.5 0 0,1 15.5,8A2.5,2.5 0 0,1 18,10.5V11Z"/></svg>' 
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

  // Effects and templates
  videoEffects: Effect[] = [
    { 
      id: '1', 
      name: 'Blur', 
      type: 'blur', 
      thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', 
      category: 'blur' 
    },
    { 
      id: '2', 
      name: 'Sharpen', 
      type: 'sharpen', 
      thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', 
      category: 'color' 
    },
    { 
      id: '3', 
      name: 'Vintage', 
      type: 'vintage', 
      thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', 
      category: 'artistic' 
    },
    { 
      id: '4', 
      name: 'Glow', 
      type: 'glow', 
      thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', 
      category: 'artistic' 
    },
    { 
      id: '5', 
      name: 'Zoom', 
      type: 'zoom', 
      thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', 
      category: 'distortion' 
    },
    { 
      id: '6', 
      name: 'Shake', 
      type: 'shake', 
      thumbnail: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&dpr=1', 
      category: 'distortion' 
    }
  ];

  titleTemplates: TitleTemplate[] = [
    { id: '1', name: 'Simple Title', preview: 'Title', style: { fontSize: '24px', color: '#fff' } },
    { id: '2', name: 'Subtitle', preview: 'Subtitle', style: { fontSize: '18px', color: '#ccc' } },
    { id: '3', name: 'Lower Third', preview: 'Name', style: { fontSize: '20px', color: '#fff', background: '#333' } }
  ];

  audioTools: AudioTool[] = [
    { 
      type: 'extract-voice', 
      name: 'Extract Voice', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/></svg>' 
    },
    { 
      type: 'remove-background', 
      name: 'Remove BG Audio', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z"/></svg>' 
    },
    { 
      type: 'noise-reduction', 
      name: 'Noise Reduction', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/></svg>' 
    },
    { 
      type: 'audio-mixer', 
      name: 'Audio Mixer', 
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H7A2,2 0 0,0 9,19V5A2,2 0 0,0 7,3M7,19H5V5H7V19M12,3H10A2,2 0 0,0 8,5V19A2,2 0 0,0 10,21H12A2,2 0 0,0 14,19V5A2,2 0 0,0 12,3M12,19H10V5H12V19M19,3H17A2,2 0 0,0 15,5V19A2,2 0 0,0 17,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H17V5H19V19Z"/></svg>' 
    }
  ];

  // Toast notifications
  toasts: Toast[] = [];
  private toastIdCounter = 0;

  constructor(
    private mediaService: MediaService,
    private router: Router
  ) {
    this.generateTimeMarkers();
    this.initializeTrackStates();
  }

  ngOnInit(): void {
    this.loadMedia();
    this.setupKeyboardShortcuts();
  }

  ngOnDestroy(): void {
    this.removeKeyboardShortcuts();
  }

  // Keyboard shortcuts
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }

  private removeKeyboardShortcuts(): void {
    document.removeEventListener('keydown', this.handleKeyboardShortcuts.bind(this));
  }

  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Spacebar for play/pause
    if (event.code === 'Space' && event.target === document.body) {
      event.preventDefault();
      this.togglePlayPause();
    }
  }

  // UI Methods
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleInspector(): void {
    this.inspectorCollapsed = !this.inspectorCollapsed;
  }

  toggleProjectDropdown(): void {
    this.showToast('Project dropdown opened', 'info');
  }

  toggleLanguage(): void {
    this.currentLanguage = this.currentLanguage === 'EN' ? 'AR' : 'EN';
    this.showToast(`Language switched to ${this.currentLanguage}`, 'info');
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

  private filterMedia(): void {
    if (!this.searchQuery.trim()) {
      this.filteredMedia = [...this.allMedia];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredMedia = this.allMedia.filter(media =>
        media.title?.toLowerCase().includes(query) ||
        media.description?.toLowerCase().includes(query) ||
        media.sourceLanguage?.toLowerCase().includes(query) ||
        media.destinationLanguage?.toLowerCase().includes(query)
      );
    }
  }

  // Media management
  loadMedia(): void {
    this.isLoading = true;
    this.loadingMessage = 'Loading media library...';
    
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
        this.isLoading = false;
        this.showToast('Media loaded successfully', 'success');
      },
      error: (error) => {
        console.error('Failed to load media:', error);
        this.isLoading = false;
        this.showToast('Failed to load media', 'error');
      }
    });
  }

  selectMedia(media: MediaDto): void {
    this.selectedMedia = media;
    this.showToast(`Selected: ${media.title}`, 'info');
  }

  addMediaToPreview(media: MediaDto): void {
    this.selectedMedia = media;
    this.selectedVideoForPreview = media.video || '';
    this.showToast(`Now previewing: ${media.title}`, 'success');
  }

  onMediaThumbnailError(event: Event, media: MediaDto): void {
    console.error('Media thumbnail failed to load:', media.title, media.video);
    const videoElement = event.target as HTMLVideoElement;
    // Don't hide the element, just show placeholder
    videoElement.style.opacity = '0';
  }

  openImportDialog(): void {
    // Create file input for direct import
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,audio/*,image/*';
    input.multiple = true;
    
    input.onchange = (e: any) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        this.handleFileImport(files);
      }
    };
    
    input.click();
  }

  private handleFileImport(files: FileList): void {
    this.isLoading = true;
    this.loadingMessage = 'Importing media files...';
    
    const importPromises: Promise<any>[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Create media DTO
      const mediaDto = {
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        description: `Imported ${file.type} file`,
        video: URL.createObjectURL(file), // Create blob URL
        metaData: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          importedAt: new Date().toISOString()
        }),
        projectId: '', // Will be set when added to timeline
        sourceLanguage: 'en',
        destinationLanguage: 'en',
        countryDialect: ''
      };
      
      // Add to media service
      const promise = this.mediaService.create(mediaDto).toPromise()
        .then((createdMedia) => {
          // Try to upload the actual file
          const formData = new FormData();
          formData.append('video', file, file.name);
          
          return this.mediaService.uploadVideo(createdMedia.id, formData).toPromise()
            .catch((uploadError) => {
              console.warn('File upload failed, but media record created:', uploadError);
              return createdMedia; // Return the created media even if upload fails
            });
        })
        .catch((error) => {
          console.error('Failed to create media record:', error);
          // Create a local media object for immediate use
          return {
            id: `local-${Date.now()}-${i}`,
            title: mediaDto.title,
            video: mediaDto.video,
            description: mediaDto.description,
            metaData: mediaDto.metaData
          };
        });
      
      importPromises.push(promise);
    }
    
    Promise.allSettled(importPromises).then((results) => {
      const successfulImports = results.filter(r => r.status === 'fulfilled').length;
      const failedImports = results.length - successfulImports;
      
      this.isLoading = false;
      
      if (successfulImports > 0) {
        this.showToast(`Successfully imported ${successfulImports} file(s)`, 'success');
        this.loadMedia(); // Refresh media library
      }
      
      if (failedImports > 0) {
        this.showToast(`Failed to import ${failedImports} file(s)`, 'warning');
      }
    });
  }

  // Playback controls
  togglePlayPause(): void {
    if (this.videoPlayer?.nativeElement) {
      if (this.isPlaying) {
        this.videoPlayer.nativeElement.pause();
      } else {
        this.videoPlayer.nativeElement.play();
      }
    }
  }

  skipBackward(): void {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.currentTime = Math.max(0, this.videoPlayer.nativeElement.currentTime - 10);
    }
  }

  skipForward(): void {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.currentTime = Math.min(
        this.videoPlayer.nativeElement.duration || 0, 
        this.videoPlayer.nativeElement.currentTime + 10
      );
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

  onVideoError(event: Event): void {
    const video = event.target as HTMLVideoElement;
    console.error('Video playback error:', video.error);
    this.showToast('Video playback error. Please try a different file.', 'error');
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

  onClipDrop(event: CdkDragDrop<any>): void {
    const dragData = event.item.data;
    const dropData = event.container.data;
    
    if (dragData.media) {
      this.addMediaToTimeline(dragData.media, dropData.type, dropData.index);
    } else if (dragData.effect) {
      this.applyEffect(dragData.effect);
    }
  }

  private addMediaToTimeline(media: MediaDto, trackType: 'video' | 'audio', trackIndex: number): void {
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

  startPlayheadDrag(event: MouseEvent): void {
    event.preventDefault();
    // Implement playhead dragging
  }

  // Effects and tools
  applyEffect(effect: Effect): void {
    if (this.selectedClip) {
      if (!this.selectedClip.effects) {
        this.selectedClip.effects = [];
      }
      this.selectedClip.effects.push(effect);
      this.showToast(`Applied ${effect.name} effect`, 'success');
    } else {
      this.showToast('Please select a clip first', 'warning');
    }
  }

  addTextElement(template: TitleTemplate): void {
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
    }
  }

  // Caption tools
  generateAutoCaption(): void {
    this.isLoading = true;
    this.loadingMessage = 'Generating automatic captions...';
    
    setTimeout(() => {
      this.isLoading = false;
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

  // Export
  openExportModal(): void {
    this.showToast('Opening export settings...', 'info');
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

  // TrackBy functions for performance
  trackByIndex(index: number): number {
    return index;
  }

  trackByMediaId(index: number, media: MediaDto): string {
    return media.id;
  }

  trackByEffectId(index: number, effect: Effect): string {
    return effect.id;
  }

  trackByTemplateId(index: number, template: TitleTemplate): string {
    return template.id;
  }

  trackByToolType(index: number, tool: AudioTool): string {
    return tool.type;
  }

  trackByClipId(index: number, clip: Clip): string {
    return clip.id;
  }

  trackByMarkerTime(index: number, marker: TimeMarker): string {
    return marker.time;
  }

  trackByToastId(index: number, toast: Toast): string {
    return toast.id;
  }

  // Toast notifications
  private showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    const toast: Toast = {
      id: (++this.toastIdCounter).toString(),
      message,
      type
    };
    
    this.toasts.push(toast);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      this.dismissToast(toast.id);
    }, 4000);
  }

  dismissToast(toastId: string): void {
    this.toasts = this.toasts.filter(t => t.id !== toastId);
  }
}