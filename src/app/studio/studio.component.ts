import { Component, OnInit, ViewChild, ElementRef, OnDestroy, HostListener } from '@angular/core';
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
  trackType: 'video' | 'audio' | 'text';
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

interface ExportSettings {
  resolution: string;
  quality: string;
  format: string;
}

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  clip?: Clip;
}

interface UndoRedoState {
  clips: Clip[];
  selectedClip: Clip | null;
  timestamp: number;
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
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // UI State
  sidebarCollapsed: boolean = false;
  inspectorCollapsed: boolean = false;
  activeTab: string = 'media';
  isLoading: boolean = false;
  loadingMessage: string = '';
  selectedTool: string = 'select';
  
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

  // Context menu
  contextMenu: ContextMenu = { visible: false, x: 0, y: 0 };

  // Undo/Redo system
  undoStack: UndoRedoState[] = [];
  redoStack: UndoRedoState[] = [];
  maxUndoStates: number = 50;

  // Trimming state
  isTrimming: boolean = false;
  trimClip: Clip | null = null;
  trimSide: 'left' | 'right' = 'left';
  trimStartX: number = 0;
  trimStartTime: number = 0;

  // Playhead dragging
  isDraggingPlayhead: boolean = false;
  playheadStartX: number = 0;

  // Export
  showExportModal: boolean = false;
  isExporting: boolean = false;
  exportProgress: number = 0;
  exportSettings: ExportSettings = {
    resolution: '1080p',
    quality: 'high',
    format: 'mp4'
  };

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
    this.saveState(); // Initial state
  }

  ngOnDestroy(): void {
    this.removeKeyboardShortcuts();
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  // Keyboard shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Prevent default for our shortcuts
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return; // Don't interfere with input fields
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.togglePlayPause();
        break;
      case 'KeyS':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.setTool('razor');
        }
        break;
      case 'KeyV':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.setTool('select');
        }
        break;
      case 'KeyC':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.setTool('razor');
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (this.selectedClip) {
          event.preventDefault();
          this.deleteClip();
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
        if (this.selectedClip && !event.shiftKey) {
          event.preventDefault();
          this.nudgeClip(-0.1);
        }
        break;
      case 'ArrowRight':
        if (this.selectedClip && !event.shiftKey) {
          event.preventDefault();
          this.nudgeClip(0.1);
        }
        break;
    }
  }

  private setupKeyboardShortcuts(): void {
    // Already handled by @HostListener
  }

  private removeKeyboardShortcuts(): void {
    // Cleanup handled by @HostListener
  }

  // Undo/Redo System
  private saveState(): void {
    const state: UndoRedoState = {
      clips: JSON.parse(JSON.stringify(this.clips)),
      selectedClip: this.selectedClip ? JSON.parse(JSON.stringify(this.selectedClip)) : null,
      timestamp: Date.now()
    };

    this.undoStack.push(state);
    if (this.undoStack.length > this.maxUndoStates) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack when new action is performed
  }

  undo(): void {
    if (this.undoStack.length > 1) {
      const currentState = this.undoStack.pop()!;
      this.redoStack.push(currentState);
      
      const previousState = this.undoStack[this.undoStack.length - 1];
      this.restoreState(previousState);
      this.showToast('Undone', 'info');
    }
  }

  redo(): void {
    if (this.redoStack.length > 0) {
      const state = this.redoStack.pop()!;
      this.undoStack.push(state);
      this.restoreState(state);
      this.showToast('Redone', 'info');
    }
  }

  private restoreState(state: UndoRedoState): void {
    this.clips = JSON.parse(JSON.stringify(state.clips));
    this.selectedClip = state.selectedClip ? JSON.parse(JSON.stringify(state.selectedClip)) : null;
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

  setTool(tool: string): void {
    this.selectedTool = tool;
    this.showToast(`Selected ${tool} tool`, 'info');
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
    
    // Wait for video element to be available
    setTimeout(() => {
      if (this.videoPlayer?.nativeElement) {
        const video = this.videoPlayer.nativeElement;
        video.load(); // Force reload
        video.currentTime = 0;
        this.currentTime = 0;
        this.showToast(`Now previewing: ${media.title}`, 'success');
      }
    }, 100);
  }

  onMediaThumbnailError(event: Event, media: MediaDto): void {
    console.error('Media thumbnail failed to load:', media.title, media.video);
    const videoElement = event.target as HTMLVideoElement;
    videoElement.style.opacity = '0';
  }

  onThumbnailLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    video.currentTime = 1;
  }

  openImportDialog(): void {
    this.fileInput.nativeElement.click();
  }

  handleFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (files && files.length > 0) {
      this.isLoading = true;
      this.loadingMessage = 'Importing media files...';
      
      const importPromises: Promise<any>[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create blob URL for immediate use
        const blobUrl = URL.createObjectURL(file);
        
        // Create media DTO
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
        
        // Add to local media list immediately
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
        
        this.allMedia.push(localMedia);
        
        // Try to save to backend
        const promise = this.mediaService.create(mediaDto).toPromise()
          .then((createdMedia) => {
            // Update the local media with the server ID
            const index = this.allMedia.findIndex(m => m.id === localMedia.id);
            if (index !== -1) {
              this.allMedia[index] = { ...createdMedia, video: blobUrl };
            }
            
            const formData = new FormData();
            formData.append('video', file, file.name);
            
            return this.mediaService.uploadVideo(createdMedia.id, formData).toPromise()
              .catch((uploadError) => {
                console.warn('File upload failed, but media record created:', uploadError);
                return createdMedia;
              });
          })
          .catch((error) => {
            console.error('Failed to create media record:', error);
            return localMedia; // Keep the local version
          });
        
        importPromises.push(promise);
      }
      
      // Update UI immediately
      this.filterMedia();
      this.isLoading = false;
      this.showToast(`Imported ${files.length} file(s) successfully!`, 'success');
      
      // Handle backend operations in background
      Promise.allSettled(importPromises).then((results) => {
        const successfulUploads = results.filter(r => r.status === 'fulfilled').length;
        if (successfulUploads > 0) {
          this.showToast(`${successfulUploads} file(s) uploaded to server`, 'info');
        }
      });
    }
    
    // Reset input
    input.value = '';
  }

  // Playback controls
  togglePlayPause(): void {
    if (this.videoPlayer?.nativeElement) {
      const video = this.videoPlayer.nativeElement;
      if (this.isPlaying) {
        video.pause();
      } else {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Video play failed:', error);
            this.showToast('Video playback failed. Please try a different file.', 'error');
          });
        }
      }
    } else {
      this.showToast('No video loaded for playback', 'warning');
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
    this.showToast('Video loaded successfully', 'success');
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

  isTrackMuted(type: 'video' | 'audio' | 'text', trackIndex: number): boolean {
    return this.mutedTracks[`${type}-${trackIndex}`] || false;
  }

  isTrackSolo(type: 'video' | 'audio' | 'text', trackIndex: number): boolean {
    return this.soloTracks[`${type}-${trackIndex}`] || false;
  }

  getTrackVolume(type: 'video' | 'audio' | 'text', trackIndex: number): number {
    return this.trackVolumes[`${type}-${trackIndex}`] || 100;
  }

  toggleTrackMute(type: 'video' | 'audio' | 'text', trackIndex: number): void {
    const key = `${type}-${trackIndex}`;
    this.mutedTracks[key] = !this.mutedTracks[key];
    this.showToast(`Track ${type} ${trackIndex + 1} ${this.mutedTracks[key] ? 'muted' : 'unmuted'}`, 'info');
  }

  toggleTrackSolo(type: 'video' | 'audio' | 'text', trackIndex: number): void {
    const key = `${type}-${trackIndex}`;
    this.soloTracks[key] = !this.soloTracks[key];
    this.showToast(`Track ${type} ${trackIndex + 1} ${this.soloTracks[key] ? 'soloed' : 'unsoloed'}`, 'info');
  }

  setTrackVolume(type: 'video' | 'audio' | 'text', trackIndex: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const key = `${type}-${trackIndex}`;
    this.trackVolumes[key] = parseInt(target.value);
  }

  onTrackClick(type: 'video' | 'audio' | 'text', trackIndex: number, event: MouseEvent): void {
    if (this.selectedTool === 'razor') {
      // Calculate time position and split clips at that position
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const x = event.clientX - rect.left;
      const timePosition = (x / rect.width) * this.totalDuration;
      
      this.splitClipsAtTime(type, trackIndex, timePosition);
    }
  }

  // Clip management
  getClipsForTrack(type: 'video' | 'audio' | 'text', trackIndex: number): Clip[] {
    return this.clips
      .filter(clip => clip.trackType === type && clip.trackIndex === trackIndex)
      .sort((a, b) => a.startTime - b.startTime);
  }

  selectClip(clip: Clip, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedClip = clip;
    this.hideContextMenu();
    this.showToast(`Selected: ${clip.name}`, 'info');
  }

  onClipRightClick(clip: Clip, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectedClip = clip;
    this.showContextMenu(event.clientX, event.clientY, clip);
  }

  // Drag and Drop
  onClipDrop(event: CdkDragDrop<any>): void {
    const dragData = event.item.data;
    const dropData = event.container.data;
    
    if (dragData.type === 'media' && dragData.media) {
      this.addMediaToTimeline(dragData.media, dropData.type, dropData.index);
    } else if (dragData.type === 'effect' && dragData.effect) {
      this.applyEffect(dragData.effect);
    } else if (dragData.type === 'text' && dragData.template) {
      this.addTextToTimeline(dragData.template, dropData.index);
    } else if (dragData.id) {
      // Moving existing clip
      this.moveClip(dragData, dropData, event);
    }
  }

  onPreviewDrop(event: CdkDragDrop<any>): void {
    const dragData = event.item.data;
    
    if (dragData.type === 'media' && dragData.media) {
      this.addMediaToPreview(dragData.media);
    }
  }

  onMediaLibraryDrop(event: CdkDragDrop<any>): void {
    // Handle files dropped into media library
    if (event.item.data?.files) {
      this.handleFileImport(event.item.data.files);
    }
  }

  onClipDragStart(clip: Clip): void {
    this.selectedClip = clip;
  }

  onClipDragEnd(clip: Clip, event: any): void {
    // Update clip position based on drop location
    const dropPoint = event.dropPoint;
    if (dropPoint) {
      const rect = event.source.element.nativeElement.parentElement.getBoundingClientRect();
      const newTime = ((dropPoint.x - rect.left) / rect.width) * this.totalDuration;
      
      if (newTime >= 0 && newTime <= this.totalDuration - clip.duration) {
        clip.startTime = newTime;
        clip.endTime = newTime + clip.duration;
        this.saveState();
        this.showToast(`Moved ${clip.name}`, 'info');
      }
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
      keyframes: [],
      waveform: trackType === 'audio' ? this.generateWaveform() : undefined
    };
    
    newClip.endTime = newClip.startTime + newClip.duration;
    this.clips.push(newClip);
    this.saveState();
    this.showToast(`Added "${media.title}" to timeline`, 'success');
  }

  private addTextToTimeline(template: TitleTemplate, trackIndex: number): void {
    const textClip: Clip = {
      id: `text-${Date.now()}`,
      name: template.name,
      type: 'text',
      trackType: 'text',
      trackIndex: 0,
      inPoint: 0,
      outPoint: 5,
      duration: 5,
      startTime: this.currentTime,
      endTime: this.currentTime + 5,
      effects: [],
      keyframes: [],
      opacity: 100,
      scale: 100,
      rotation: 0
    };
    
    this.clips.push(textClip);
    this.saveState();
    this.showToast(`Added ${template.name} text`, 'success');
  }

  private moveClip(dragData: any, dropData: any, event: CdkDragDrop<any>): void {
    const clip = this.clips.find(c => c.id === dragData.id);
    if (clip) {
      clip.trackType = dropData.type;
      clip.trackIndex = dropData.index;
      this.saveState();
      this.showToast(`Moved ${clip.name} to ${dropData.type} track ${dropData.index + 1}`, 'info');
    }
  }

  private findNextAvailableTime(trackType: 'video' | 'audio' | 'text', trackIndex: number): number {
    const trackClips = this.getClipsForTrack(trackType, trackIndex);
    if (trackClips.length === 0) return 0;
    
    const lastClip = trackClips[trackClips.length - 1];
    return lastClip.endTime;
  }

  private generateWaveform(): number[] {
    // Generate fake waveform data
    return Array.from({ length: 100 }, () => Math.random() * 100);
  }

  // Trimming
  startTrimming(clip: Clip, side: 'left' | 'right', event: MouseEvent): void {
    event.stopPropagation();
    this.isTrimming = true;
    this.trimClip = clip;
    this.trimSide = side;
    this.trimStartX = event.clientX;
    this.trimStartTime = side === 'left' ? clip.startTime : clip.endTime;
    
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (this.isTrimming && this.trimClip) {
      const deltaX = event.clientX - this.trimStartX;
      const deltaTime = (deltaX / 1000) * this.totalDuration * (100 / this.timelineZoom);
      
      if (this.trimSide === 'left') {
        const newStartTime = Math.max(0, this.trimStartTime + deltaTime);
        const maxStartTime = this.trimClip.endTime - 0.1; // Minimum duration
        this.trimClip.startTime = Math.min(newStartTime, maxStartTime);
        this.trimClip.duration = this.trimClip.endTime - this.trimClip.startTime;
      } else {
        const newEndTime = Math.min(this.totalDuration, this.trimStartTime + deltaTime);
        const minEndTime = this.trimClip.startTime + 0.1; // Minimum duration
        this.trimClip.endTime = Math.max(newEndTime, minEndTime);
        this.trimClip.duration = this.trimClip.endTime - this.trimClip.startTime;
      }
    } else if (this.isDraggingPlayhead) {
      const rect = document.querySelector('.timeline-tracks')?.getBoundingClientRect();
      if (rect) {
        const x = event.clientX - rect.left;
        const newTime = Math.max(0, Math.min(this.totalDuration, (x / rect.width) * this.totalDuration));
        this.currentTime = newTime;
        
        if (this.videoPlayer?.nativeElement) {
          this.videoPlayer.nativeElement.currentTime = newTime;
        }
      }
    }
  };

  private onMouseUp = (): void => {
    if (this.isTrimming) {
      this.isTrimming = false;
      this.trimClip = null;
      this.saveState();
      this.showToast('Clip trimmed', 'info');
    }
    
    if (this.isDraggingPlayhead) {
      this.isDraggingPlayhead = false;
    }
    
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };

  // Playhead
  getPlayheadPosition(): number {
    return (this.currentTime / this.totalDuration) * (this.timelineZoom / 100) * 1000;
  }

  startPlayheadDrag(event: MouseEvent): void {
    event.preventDefault();
    this.isDraggingPlayhead = true;
    this.playheadStartX = event.clientX;
    
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  // Clip operations
  getClipPosition(clip: Clip): number {
    return (clip.startTime / this.totalDuration) * (this.timelineZoom / 100) * 1000;
  }

  getClipWidth(clip: Clip): number {
    return (clip.duration / this.totalDuration) * (this.timelineZoom / 100) * 1000;
  }

  updateClipProperty(property: string, event: Event): void {
    if (!this.selectedClip) return;
    
    const target = event.target as HTMLInputElement;
    const value = target.type === 'number' ? parseFloat(target.value) : target.value;
    
    (this.selectedClip as any)[property] = value;
    this.saveState();
    this.showToast(`Updated ${property}`, 'info');
  }

  nudgeClip(seconds: number): void {
    if (!this.selectedClip) return;
    
    const newStartTime = Math.max(0, this.selectedClip.startTime + seconds);
    const newEndTime = newStartTime + this.selectedClip.duration;
    
    if (newEndTime <= this.totalDuration) {
      this.selectedClip.startTime = newStartTime;
      this.selectedClip.endTime = newEndTime;
      this.saveState();
      this.showToast(`Nudged ${this.selectedClip.name}`, 'info');
    }
  }

  // Context menu operations
  private showContextMenu(x: number, y: number, clip?: Clip): void {
    this.contextMenu = { visible: true, x, y, clip };
  }

  private hideContextMenu(): void {
    this.contextMenu.visible = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.hideContextMenu();
  }

  splitClip(): void {
    if (!this.contextMenu.clip) return;
    
    const clip = this.contextMenu.clip;
    const splitTime = this.currentTime;
    
    if (splitTime > clip.startTime && splitTime < clip.endTime) {
      const newClip: Clip = {
        ...JSON.parse(JSON.stringify(clip)),
        id: `${clip.type}-${Date.now()}`,
        startTime: splitTime,
        endTime: clip.endTime,
        duration: clip.endTime - splitTime
      };
      
      clip.endTime = splitTime;
      clip.duration = splitTime - clip.startTime;
      
      this.clips.push(newClip);
      this.saveState();
      this.showToast(`Split ${clip.name}`, 'success');
    }
    
    this.hideContextMenu();
  }

  duplicateClip(): void {
    if (!this.contextMenu.clip) return;
    
    const clip = this.contextMenu.clip;
    const newClip: Clip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: `${clip.type}-${Date.now()}`,
      startTime: clip.endTime,
      endTime: clip.endTime + clip.duration,
      name: `${clip.name} Copy`
    };
    
    this.clips.push(newClip);
    this.saveState();
    this.showToast(`Duplicated ${clip.name}`, 'success');
    this.hideContextMenu();
  }

  extractAudio(): void {
    if (!this.contextMenu.clip || this.contextMenu.clip.type !== 'video') return;
    
    const videoClip = this.contextMenu.clip;
    const audioClip: Clip = {
      ...JSON.parse(JSON.stringify(videoClip)),
      id: `audio-${Date.now()}`,
      type: 'audio',
      trackType: 'audio',
      trackIndex: 0,
      name: `${videoClip.name} Audio`,
      waveform: this.generateWaveform()
    };
    
    this.clips.push(audioClip);
    this.saveState();
    this.showToast(`Extracted audio from ${videoClip.name}`, 'success');
    this.hideContextMenu();
  }

  deleteClip(): void {
    const clipToDelete = this.contextMenu.clip || this.selectedClip;
    if (!clipToDelete) return;
    
    this.clips = this.clips.filter(c => c.id !== clipToDelete.id);
    if (this.selectedClip?.id === clipToDelete.id) {
      this.selectedClip = null;
    }
    this.saveState();
    this.showToast(`Deleted ${clipToDelete.name}`, 'success');
    this.hideContextMenu();
  }

  private splitClipsAtTime(trackType: 'video' | 'audio' | 'text', trackIndex: number, time: number): void {
    const trackClips = this.getClipsForTrack(trackType, trackIndex);
    const clipsToSplit = trackClips.filter(clip => 
      time > clip.startTime && time < clip.endTime
    );
    
    clipsToSplit.forEach(clip => {
      const newClip: Clip = {
        ...JSON.parse(JSON.stringify(clip)),
        id: `${clip.type}-${Date.now()}`,
        startTime: time,
        endTime: clip.endTime,
        duration: clip.endTime - time
      };
      
      clip.endTime = time;
      clip.duration = time - clip.startTime;
      
      this.clips.push(newClip);
    });
    
    if (clipsToSplit.length > 0) {
      this.saveState();
      this.showToast(`Split ${clipsToSplit.length} clip(s)`, 'success');
    }
  }

  // Effects and tools
  applyEffect(effect: Effect): void {
    if (this.selectedClip) {
      if (!this.selectedClip.effects) {
        this.selectedClip.effects = [];
      }
      this.selectedClip.effects.push(effect);
      this.saveState();
      this.showToast(`Applied ${effect.name} effect`, 'success');
    } else {
      this.showToast('Please select a clip first', 'warning');
    }
  }

  removeEffect(index: number): void {
    if (this.selectedClip?.effects) {
      const effect = this.selectedClip.effects[index];
      this.selectedClip.effects.splice(index, 1);
      this.saveState();
      this.showToast(`Removed ${effect.name} effect`, 'info');
    }
  }

  addTextElement(template: TitleTemplate): void {
    this.addTextToTimeline(template, 0);
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
      this.exportProgress += 5;
      
      if (this.exportProgress >= 100) {
        clearInterval(interval);
        this.isExporting = false;
        this.showToast('Video exported successfully!', 'success');
        this.closeExportModal();
        
        // Simulate download
        const link = document.createElement('a');
        link.href = '#';
        link.download = `${this.currentProjectName}.${this.exportSettings.format}`;
        link.click();
      }
    }, 100);
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