import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MediaService } from '../proxy/medias/media.service';
import { MediaDto, CreateUpdateMediaDto } from '../proxy/medias/models';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Enhanced interfaces for professional video editing
interface Clip {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'effect' | 'transition';
  startTime: number;
  endTime: number;
  duration: number;
  src?: string;
  effectType?: string;
  track: number;
  trackType: 'video' | 'audio';
  mediaId?: string;
  volume?: number;
  opacity?: number;
  speed?: number;
  filters?: string[];
  keyframes?: any[];
}

interface Effect {
  id: string;
  name: string;
  type: string;
  thumbnail: string;
  category: 'color' | 'blur' | 'distortion' | 'artistic' | 'transition';
  parameters?: any;
}

interface AudioTool {
  type: string;
  title: string;
  description: string;
}

interface TitleTemplate {
  id: string;
  name: string;
  preview: string;
  style: any;
}

@Component({
  selector: 'app-studio',
  standalone: false,
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.scss'
})
export class StudioComponent implements OnInit {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  // Navigation state
  activeNavItem: string = 'media';
  isMediaPanelExpanded: boolean = true;
  isAudioPanelExpanded: boolean = false;
  isEffectsPanelExpanded: boolean = false;
  isTextPanelExpanded: boolean = false;
  isCaptionsPanelExpanded: boolean = false;

  // Project state
  currentProjectName: string = 'Untitled Project';
  currentProjectId: string;
  
  // Media and search
  projectVideos: MediaDto[] = [];
  filteredVideos: MediaDto[] = [];
  searchQuery: string = '';
  searchTags: string[] = ['blur', 'zoom', 'retro', 'shake', 'rainbow', 'voice', 'music'];
  selectedMedia: MediaDto | null = null;

  // Playback state
  isPlaying: boolean = false;
  currentTime: number = 0;
  totalDuration: number = 240; // 4 minutes default
  selectedVideoForPreview: string = '';
  previewingVideo: MediaDto | null = null;

  // Timeline state
  zoomLevel: number = 100;
  timelineZoom: number = 100;
  selectedClipId: string | null = null;
  clips: Clip[] = [];
  videoTracks: number[] = [0, 1, 2];
  audioTracks: number[] = [0, 1, 2, 3];
  timeMarkers: string[] = ['00:00', '01:00', '02:00', '03:00', '04:00'];

  // Undo/Redo
  undoStack: Clip[][] = [];
  redoStack: Clip[][] = [];

  // Modal states
  showVideoPreviewModal: boolean = false;
  showAudioToolsModal: boolean = false;
  showExportModal: boolean = false;

  // Audio tools
  currentAudioTool: AudioTool | null = null;
  audioToolOptions = {
    removeBackground: false,
    enhanceVoice: true,
    noiseReduction: 50
  };
  mixerLevels: number[] = [100, 100, 100, 100];

  // Export settings
  exportSettings = {
    format: 'mp4',
    quality: '1080p',
    frameRate: '30',
    bitrate: 10
  };

  // Effects and templates
  videoEffects: Effect[] = [
    { id: '1', name: 'Blur', type: 'blur', thumbnail: 'assets/images/placeholders/80x80.png', category: 'blur' },
    { id: '2', name: 'Sharpen', type: 'sharpen', thumbnail: 'assets/images/placeholders/80x80.png', category: 'color' },
    { id: '3', name: 'Vintage', type: 'vintage', thumbnail: 'assets/images/placeholders/80x80.png', category: 'artistic' },
    { id: '4', name: 'Glow', type: 'glow', thumbnail: 'assets/images/placeholders/80x80.png', category: 'artistic' },
    { id: '5', name: 'Zoom', type: 'zoom', thumbnail: 'assets/images/placeholders/80x80.png', category: 'distortion' },
    { id: '6', name: 'Shake', type: 'shake', thumbnail: 'assets/images/placeholders/80x80.png', category: 'distortion' }
  ];

  transitions: Effect[] = [
    { id: '1', name: 'Fade', type: 'fade', thumbnail: 'assets/images/placeholders/80x80.png', category: 'transition' },
    { id: '2', name: 'Slide', type: 'slide', thumbnail: 'assets/images/placeholders/80x80.png', category: 'transition' },
    { id: '3', name: 'Zoom', type: 'zoom-transition', thumbnail: 'assets/images/placeholders/80x80.png', category: 'transition' },
    { id: '4', name: 'Wipe', type: 'wipe', thumbnail: 'assets/images/placeholders/80x80.png', category: 'transition' }
  ];

  titleTemplates: TitleTemplate[] = [
    { id: '1', name: 'Simple Title', preview: 'Title', style: { fontSize: '24px', color: '#fff' } },
    { id: '2', name: 'Subtitle', preview: 'Subtitle', style: { fontSize: '18px', color: '#ccc' } },
    { id: '3', name: 'Lower Third', preview: 'Name', style: { fontSize: '20px', color: '#fff', background: '#333' } }
  ];

  // Language mapping
  private languageMap: { [key: string]: string } = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
    'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi'
  };

  constructor(
    private mediaService: MediaService,
    private router: Router
  ) {
    this.currentProjectId = this.generateGuid();
  }

  ngOnInit(): void {
    this.loadProjectVideos();
    this.saveStateForUndo();
    this.initializeDefaultClips();
  }

  // Navigation methods
  onNavClick(item: string): void {
    this.activeNavItem = item;
    
    // Reset all panel states
    this.isMediaPanelExpanded = false;
    this.isAudioPanelExpanded = false;
    this.isEffectsPanelExpanded = false;
    this.isTextPanelExpanded = false;
    this.isCaptionsPanelExpanded = false;
    
    // Set active panel
    switch (item) {
      case 'media':
        this.isMediaPanelExpanded = true;
        this.loadProjectVideos();
        break;
      case 'audio':
        this.isAudioPanelExpanded = true;
        break;
      case 'effects':
        this.isEffectsPanelExpanded = true;
        break;
      case 'text':
        this.isTextPanelExpanded = true;
        break;
      case 'captions':
        this.isCaptionsPanelExpanded = true;
        break;
    }
    
    this.showMessage(`${item.charAt(0).toUpperCase() + item.slice(1)} panel opened`);
  }

  onSearchChange(): void {
    this.filterVideos();
  }

  applySearchTag(tag: string): void {
    this.searchQuery = tag;
    this.filterVideos();
  }

  private filterVideos(): void {
    if (!this.searchQuery.trim()) {
      this.filteredVideos = [...this.projectVideos];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredVideos = this.projectVideos.filter(video =>
        video.title?.toLowerCase().includes(query) ||
        video.description?.toLowerCase().includes(query) ||
        video.sourceLanguage?.toLowerCase().includes(query) ||
        video.destinationLanguage?.toLowerCase().includes(query)
      );
    }
  }

  // Media management
  loadProjectVideos(): void {
    this.mediaService.getList({
      maxResultCount: 100,
      skipCount: 0,
      sorting: 'title'
    }).subscribe({
      next: (response) => {
        this.projectVideos = response.items?.filter(video => 
          video.video && video.video.trim() !== ''
        ) || [];
        this.filterVideos();
        console.log('Loaded project videos:', this.projectVideos.length);
      },
      error: (error) => {
        console.error('Failed to load project videos:', error);
        this.showMessage('Failed to load project videos', 'error');
      }
    });
  }

  selectVideoForPreview(video: MediaDto): void {
    this.selectedMedia = video;
    this.selectedVideoForPreview = video.video || '';
    this.showMessage(`Selected: ${video.title}`);
  }

  previewVideo(video: MediaDto): void {
    this.previewingVideo = video;
    this.showVideoPreviewModal = true;
  }

  closeVideoPreview(): void {
    this.showVideoPreviewModal = false;
    this.previewingVideo = null;
  }

  addVideoToTimeline(video: MediaDto): void {
    this.saveStateForUndo();
    
    const newClip: Clip = {
      id: `video-${Date.now()}`,
      name: video.title || 'Untitled Video',
      type: 'video',
      startTime: this.findNextAvailableTime('video', 0),
      endTime: 0,
      duration: 30, // Default 30 seconds
      src: video.video || '',
      mediaId: video.id,
      track: 0,
      trackType: 'video',
      volume: 100,
      opacity: 100,
      speed: 1
    };
    
    newClip.endTime = newClip.startTime + newClip.duration;
    this.clips.push(newClip);
    this.sortClips();
    this.showMessage(`Added "${video.title}" to timeline`);
  }

  navigateToCreateMedia(): void {
    this.router.navigate(['/media/create']);
  }

  onVideoThumbnailError(event: Event, video: MediaDto): void {
    console.error('Video thumbnail failed to load:', video.title, video.video);
    const videoElement = event.target as HTMLVideoElement;
    videoElement.style.display = 'none';
  }

  // Header actions
  onHeaderButtonClick(buttonName: string): void {
    switch (buttonName) {
      case 'save-project':
        this.saveProject();
        break;
      case 'new-project':
        this.createNewProject();
        break;
      case 'export':
        this.showExportModal = true;
        break;
      case 'share':
        this.shareProject();
        break;
      case 'settings':
        this.showProjectSettings();
        break;
      default:
        console.log(`Header button clicked: ${buttonName}`);
    }
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
    this.showMessage(this.isPlaying ? 'Playing' : 'Paused');
  }

  onVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.totalDuration = video.duration || 240;
  }

  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.currentTime = video.currentTime;
  }

  // Timeline controls
  zoomIn(): void {
    if (this.zoomLevel < 400) {
      this.zoomLevel += 25;
      this.showMessage(`Zoomed in to ${this.zoomLevel}%`);
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > 25) {
      this.zoomLevel -= 25;
      this.showMessage(`Zoomed out to ${this.zoomLevel}%`);
    }
  }

  onTimelineZoomChange(): void {
    this.updateTimeMarkers();
  }

  fitTimelineToWindow(): void {
    this.timelineZoom = 100;
    this.updateTimeMarkers();
    this.showMessage('Timeline fitted to window');
  }

  private updateTimeMarkers(): void {
    const totalSeconds = this.totalDuration;
    const markerCount = 5;
    const interval = totalSeconds / (markerCount - 1);
    
    this.timeMarkers = Array.from({ length: markerCount }, (_, i) => 
      this.formatTime(i * interval)
    );
  }

  // Clip management
  selectClip(clipId: string): void {
    this.selectedClipId = clipId;
    const clip = this.clips.find(c => c.id === clipId);
    if (clip) {
      this.showMessage(`Selected: ${clip.name}`);
    }
  }

  editClip(clip: Clip): void {
    // Open clip editor modal
    this.showMessage(`Editing: ${clip.name}`);
  }

  deleteSelectedClip(): void {
    if (this.selectedClipId) {
      this.saveStateForUndo();
      this.clips = this.clips.filter(clip => clip.id !== this.selectedClipId);
      this.showMessage('Clip deleted');
      this.selectedClipId = null;
    }
  }

  splitAtCurrentTime(): void {
    if (this.selectedClipId) {
      const clip = this.clips.find(c => c.id === this.selectedClipId);
      if (clip && this.currentTime > clip.startTime && this.currentTime < clip.endTime) {
        this.cutClip(this.selectedClipId, this.currentTime);
      }
    }
  }

  cutClip(clipId: string, time: number): void {
    this.saveStateForUndo();
    const clipIndex = this.clips.findIndex(c => c.id === clipId);
    if (clipIndex !== -1) {
      const clip = this.clips[clipIndex];
      if (time > clip.startTime && time < clip.endTime) {
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
        
        this.clips.splice(clipIndex, 1, firstClip, secondClip);
        this.showMessage(`Clip split at ${this.formatTime(time)}`);
      }
    }
  }

  extractAudio(): void {
    if (this.selectedClipId) {
      const clip = this.clips.find(c => c.id === this.selectedClipId);
      if (clip && clip.type === 'video') {
        this.saveStateForUndo();
        
        const audioClip: Clip = {
          ...clip,
          id: `audio_${clip.id}`,
          name: `${clip.name} (Audio)`,
          type: 'audio',
          trackType: 'audio',
          track: this.findAvailableAudioTrack()
        };
        
        this.clips.push(audioClip);
        this.sortClips();
        this.showMessage(`Audio extracted from ${clip.name}`);
      }
    }
  }

  // Effects and tools
  applyEffect(effect: Effect): void {
    if (this.selectedClipId) {
      this.saveStateForUndo();
      const clip = this.clips.find(c => c.id === this.selectedClipId);
      if (clip) {
        if (!clip.filters) clip.filters = [];
        clip.filters.push(effect.type);
        this.showMessage(`Applied ${effect.name} effect`);
      }
    } else {
      this.showMessage('Please select a clip first', 'warning');
    }
  }

  applyTransition(transition: Effect): void {
    this.saveStateForUndo();
    
    const transitionClip: Clip = {
      id: `transition-${Date.now()}`,
      name: transition.name,
      type: 'transition',
      startTime: this.currentTime,
      endTime: this.currentTime + 2,
      duration: 2,
      effectType: transition.type,
      track: 0,
      trackType: 'video'
    };
    
    this.clips.push(transitionClip);
    this.sortClips();
    this.showMessage(`Added ${transition.name} transition`);
  }

  addTextElement(template: TitleTemplate): void {
    this.saveStateForUndo();
    
    const textClip: Clip = {
      id: `text-${Date.now()}`,
      name: template.name,
      type: 'text',
      startTime: this.currentTime,
      endTime: this.currentTime + 5,
      duration: 5,
      track: 1,
      trackType: 'video'
    };
    
    this.clips.push(textClip);
    this.sortClips();
    this.showMessage(`Added ${template.name} text`);
  }

  // Audio tools
  openAudioTool(toolType: string): void {
    const tools: { [key: string]: AudioTool } = {
      'extract-voice': {
        type: 'extract-voice',
        title: 'Extract Voice',
        description: 'Extract voice from video while preserving quality'
      },
      'remove-background': {
        type: 'remove-background',
        title: 'Remove Background Audio',
        description: 'Remove background music and noise'
      },
      'noise-reduction': {
        type: 'noise-reduction',
        title: 'Noise Reduction',
        description: 'Reduce background noise and improve audio quality'
      },
      'audio-mixer': {
        type: 'audio-mixer',
        title: 'Audio Mixer',
        description: 'Mix multiple audio tracks with professional controls'
      }
    };
    
    this.currentAudioTool = tools[toolType];
    this.showAudioToolsModal = true;
  }

  closeAudioToolsModal(): void {
    this.showAudioToolsModal = false;
    this.currentAudioTool = null;
  }

  processAudioTool(): void {
    if (!this.currentAudioTool) return;
    
    this.showMessage(`Processing ${this.currentAudioTool.title}...`, 'info');
    
    // Simulate processing
    setTimeout(() => {
      this.showMessage(`${this.currentAudioTool!.title} completed successfully!`, 'success');
      this.closeAudioToolsModal();
    }, 2000);
  }

  generateAutoCaption(): void {
    this.showMessage('Generating automatic captions...', 'info');
    
    // Simulate caption generation
    setTimeout(() => {
      this.showMessage('Captions generated successfully!', 'success');
    }, 3000);
  }

  importSubtitles(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.srt,.vtt,.ass';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        this.showMessage(`Importing subtitles from ${file.name}...`, 'info');
        // Process subtitle file
        setTimeout(() => {
          this.showMessage('Subtitles imported successfully!', 'success');
        }, 1500);
      }
    };
    input.click();
  }

  translateCaptions(): void {
    this.showMessage('Translating captions...', 'info');
    
    // Simulate translation
    setTimeout(() => {
      this.showMessage('Captions translated successfully!', 'success');
    }, 2500);
  }

  // Drag and drop
  drop(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      this.saveStateForUndo();
      const dragData = event.item.data;
      const targetTrackData = event.container.data;
      
      if (dragData.type === 'video' && dragData.media) {
        this.addVideoToTimeline(dragData.media);
      } else if (dragData.type === 'effect') {
        this.applyEffect(dragData.effect);
      } else if (dragData.type === 'transition') {
        this.applyTransition(dragData.effect);
      }
    }
  }

  // Timeline helpers
  clipsByTrack(trackType: 'video' | 'audio', trackNum: number): Clip[] {
    return this.clips
      .filter(clip => clip.trackType === trackType && clip.track === trackNum)
      .sort((a, b) => a.startTime - b.startTime);
  }

  getClipPosition(clip: Clip): number {
    return (clip.startTime / this.totalDuration) * 100;
  }

  getClipWidth(clip: Clip): number {
    return (clip.duration / this.totalDuration) * 100;
  }

  getClipEffectClass(clip: Clip): string {
    if (clip.effectType) {
      return `${clip.effectType}-effect`;
    }
    return '';
  }

  getWaveformBars(clip: Clip): number[] {
    // Generate fake waveform data
    const barCount = Math.max(10, Math.floor(clip.duration * 2));
    return Array.from({ length: barCount }, () => Math.random() * 100);
  }

  startResize(event: MouseEvent, clip: Clip, handle: 'left' | 'right'): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Implement resize logic
    this.showMessage(`Resizing ${clip.name}`, 'info');
  }

  showClipContextMenu(event: MouseEvent, clip: Clip): void {
    event.preventDefault();
    // Show context menu
    this.selectClip(clip.id);
  }

  // Project management
  saveProject(): void {
    const projectData = {
      name: this.currentProjectName,
      clips: this.clips,
      settings: this.exportSettings,
      lastSaved: new Date().toISOString()
    };
    
    localStorage.setItem(`project_${this.currentProjectId}`, JSON.stringify(projectData));
    this.showMessage(`Project "${this.currentProjectName}" saved!`, 'success');
  }

  createNewProject(): void {
    const newName = prompt('Enter new project name:', 'New Project');
    if (newName && newName.trim()) {
      this.currentProjectName = newName.trim();
      this.currentProjectId = this.generateGuid();
      this.clips = [];
      this.undoStack = [];
      this.redoStack = [];
      this.saveStateForUndo();
      this.showMessage(`New project "${newName}" created!`, 'success');
    }
  }

  shareProject(): void {
    const shareUrl = `${window.location.origin}/studio?project=${this.currentProjectId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      this.showMessage('Share link copied to clipboard!', 'success');
    }).catch(() => {
      prompt('Copy this share link:', shareUrl);
    });
  }

  showProjectSettings(): void {
    const newName = prompt('Project Name:', this.currentProjectName);
    if (newName && newName.trim() && newName !== this.currentProjectName) {
      this.currentProjectName = newName.trim();
      this.showMessage('Project settings updated', 'success');
    }
  }

  // Export
  closeExportModal(): void {
    this.showExportModal = false;
  }

  performExport(): void {
    this.showMessage('Starting export...', 'info');
    this.showExportModal = false;
    
    // Simulate export process
    let progress = 0;
    const exportInterval = setInterval(() => {
      progress += 10;
      this.showMessage(`Exporting... ${progress}%`, 'info');
      
      if (progress >= 100) {
        clearInterval(exportInterval);
        this.showMessage('Export completed successfully!', 'success');
      }
    }, 500);
  }

  // Undo/Redo
  undo(): void {
    if (this.undoStack.length > 1) {
      this.redoStack.push([...this.clips]);
      this.undoStack.pop();
      this.clips = [...this.undoStack[this.undoStack.length - 1]];
      this.showMessage('Undid last action');
    }
  }

  redo(): void {
    if (this.redoStack.length > 0) {
      this.undoStack.push([...this.clips]);
      this.clips = [...this.redoStack.pop()!];
      this.showMessage('Redid last action');
    }
  }

  // Utility methods
  private saveStateForUndo(): void {
    this.undoStack.push([...this.clips]);
    this.redoStack = [];
    
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  private sortClips(): void {
    this.clips.sort((a, b) => {
      if (a.trackType !== b.trackType) {
        return a.trackType === 'video' ? -1 : 1;
      }
      if (a.track !== b.track) {
        return a.track - b.track;
      }
      return a.startTime - b.startTime;
    });
  }

  private findNextAvailableTime(trackType: 'video' | 'audio', track: number): number {
    const trackClips = this.clips
      .filter(c => c.trackType === trackType && c.track === track)
      .sort((a, b) => a.startTime - b.startTime);
    
    if (trackClips.length === 0) return 0;
    
    const lastClip = trackClips[trackClips.length - 1];
    return lastClip.endTime;
  }

  private findAvailableAudioTrack(): number {
    for (let track of this.audioTracks) {
      const hasClips = this.clips.some(c => c.trackType === 'audio' && c.track === track);
      if (!hasClips) return track;
    }
    return 0;
  }

  private initializeDefaultClips(): void {
    // Add some sample clips for demonstration
    this.clips = [
      {
        id: 'sample-1',
        name: 'Sample Effect',
        type: 'effect',
        startTime: 0,
        endTime: 60,
        duration: 60,
        effectType: 'retro-shake-3',
        track: 0,
        trackType: 'video'
      }
    ];
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

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
    if (!languageCode) return 'Not specified';
    return this.languageMap[languageCode] || languageCode;
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.textContent = message;
    
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };
    
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s ease;
      max-width: 300px;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 4000);
  }

  // Getters for template
  get formattedCurrentTime(): string {
    return this.formatTime(this.currentTime);
  }

  get formattedTotalDuration(): string {
    return this.formatTime(this.totalDuration);
  }

  get playButtonIcon(): string {
    return this.isPlaying ? '⏸️' : '▶️';
  }
}