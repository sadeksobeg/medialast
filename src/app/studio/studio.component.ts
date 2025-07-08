import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MediaService } from '../proxy/medias/media.service';
import { MediaDto, CreateUpdateMediaDto } from '../proxy/medias/models';
import { Router } from '@angular/router';

// Define a simple interface for a video clip
interface Clip {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'text' | 'effect';
  startTime: number; // in seconds
  endTime: number;   // in seconds
  duration: number;  // in seconds
  src?: string;      // URL for video/audio/image
  effectType?: string; // For effect clips
  track: number;     // Which track it belongs to
  mediaId?: string; // Link to backend media ID
}

@Component({
  selector: 'app-studio',
  standalone: false,
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.scss'
})
export class StudioComponent implements OnInit {
  activeNavItem: string = 'effects';
  isEffectsPanelExpanded: boolean = true;
  isVideosPanelExpanded: boolean = true;
  showExportModal: boolean = false;
  showVideoPreviewModal: boolean = false;
  currentProjectName: string = 'My Awesome Video';
  currentProjectId: string;
  isPlaying: boolean = false;
  currentTime: number = 180; // 3 minutes in seconds
  totalDuration: number = 8167; // 2:16:07 in seconds
  zoomLevel: number = 100;
  selectedClipId: string | null = null;
  selectedVideoForPreview: string = '';
  previewingVideo: MediaDto | null = null;
  projectVideos: MediaDto[] = [];

  // Undo/Redo stacks
  undoStack: Clip[][] = [];
  redoStack: Clip[][] = [];

  // Sample clips for the timeline
  clips: Clip[] = [
    { id: 'clip1', name: 'Retro Shake 3', type: 'effect', startTime: 0, endTime: 60, duration: 60, effectType: 'retro-shake-3', track: 0 },
    { id: 'clip2', name: 'Video Clip 1', type: 'video', startTime: 30, endTime: 120, duration: 90, src: 'https://via.placeholder.com/100x50', track: 1 },
    { id: 'clip3', name: 'Diamond', type: 'effect', startTime: 90, endTime: 180, duration: 90, effectType: 'diamond-effect', track: 2 },
    { id: 'clip4', name: 'Play Day', type: 'effect', startTime: 150, endTime: 240, duration: 90, effectType: 'play-day-effect', track: 3 },
  ];

  constructor(private mediaService: MediaService, private router: Router) {
    this.currentProjectId = this.generateGuid();
  }

  ngOnInit(): void {
    console.log('ngOnInit: currentProjectId before loading media:', this.currentProjectId);
    this.loadProjectMedia(this.currentProjectId);
    this.loadProjectVideos();
    this.saveStateForUndo();
  }

  // Navigation functions
  onNavClick(item: string): void {
    this.activeNavItem = item;
    if (item === 'effects') {
      this.isEffectsPanelExpanded = !this.isEffectsPanelExpanded;
    } else {
      this.isEffectsPanelExpanded = false;
    }
    
    if (item === 'videos') {
      this.isVideosPanelExpanded = !this.isVideosPanelExpanded;
      if (this.isVideosPanelExpanded) {
        this.loadProjectVideos();
      }
    } else {
      this.isVideosPanelExpanded = false;
    }
    
    // Handle different navigation items
    switch (item) {
      case 'videos':
        this.showMessage('Videos panel opened');
        break;
      case 'photos':
        this.showMessage('Photos panel opened');
        break;
      case 'audio':
        this.showMessage('Audio panel opened');
        break;
      case 'text':
        this.showMessage('Text panel opened');
        break;
      case 'captions':
        this.showMessage('Captions panel opened');
        break;
      case 'transcript':
        this.showMessage('Transcript panel opened');
        break;
      case 'stickers':
        this.showMessage('Stickers panel opened');
        break;
      case 'format':
        this.showMessage('Format panel opened');
        break;
    }
  }

  // Header button functions
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
      case 'check':
        this.showMessage('Project validated successfully!');
        break;
      case 'bookmark':
        this.bookmarkProject();
        break;
      case 'dots':
        this.showProjectMenu();
        break;
      default:
        console.log(`Header button clicked: ${buttonName}`);
    }
  }

  // Player control functions
  onPlayerControlClick(controlName: string): void {
    switch (controlName) {
      case 'play':
        this.togglePlayPause();
        break;
      case 'minus':
        this.zoomOut();
        break;
      case 'plus':
        this.zoomIn();
        break;
      case 'trash':
        this.deleteSelectedClip();
        break;
      default:
        console.log(`Player control clicked: ${controlName}`);
    }
  }

  // Play/Pause functionality
  togglePlayPause(): void {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.showMessage('Playing video');
      // In a real app, you'd start video playback here
    } else {
      this.showMessage('Video paused');
      // In a real app, you'd pause video playback here
    }
  }

  // Zoom functions
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

  // Undo/Redo functionality
  undo(): void {
    if (this.undoStack.length > 1) {
      this.redoStack.push([...this.clips]);
      this.undoStack.pop(); // Remove current state
      this.clips = [...this.undoStack[this.undoStack.length - 1]];
      this.showMessage('Undid last action');
    } else {
      this.showMessage('Nothing to undo');
    }
  }

  redo(): void {
    if (this.redoStack.length > 0) {
      this.undoStack.push([...this.clips]);
      this.clips = [...this.redoStack.pop()!];
      this.showMessage('Redid last action');
    } else {
      this.showMessage('Nothing to redo');
    }
  }

  // Project management functions
  createNewProject(): void {
    const newName = prompt('Enter new project name:', 'New Project');
    if (newName && newName.trim()) {
      this.currentProjectName = newName.trim();
      this.currentProjectId = this.generateGuid();
      this.clips = [];
      this.undoStack = [];
      this.redoStack = [];
      this.saveStateForUndo();
      this.showMessage(`New project "${newName}" created!`);
    }
  }

  saveProject(): void {
    // In a real application, this would save to backend
    localStorage.setItem(`project_${this.currentProjectId}`, JSON.stringify({
      name: this.currentProjectName,
      clips: this.clips,
      lastSaved: new Date().toISOString()
    }));
    this.showMessage(`Project "${this.currentProjectName}" saved!`);
  }

  bookmarkProject(): void {
    const bookmarks = JSON.parse(localStorage.getItem('project_bookmarks') || '[]');
    const bookmark = {
      id: this.currentProjectId,
      name: this.currentProjectName,
      bookmarkedAt: new Date().toISOString()
    };
    
    if (!bookmarks.find((b: any) => b.id === this.currentProjectId)) {
      bookmarks.push(bookmark);
      localStorage.setItem('project_bookmarks', JSON.stringify(bookmarks));
      this.showMessage('Project bookmarked!');
    } else {
      this.showMessage('Project already bookmarked');
    }
  }

  showProjectMenu(): void {
    const action = prompt('Choose action:\n1. Duplicate Project\n2. Delete Project\n3. Project Settings\n4. Share Project\nEnter number (1-4):');
    
    switch (action) {
      case '1':
        this.duplicateProject();
        break;
      case '2':
        this.deleteProject();
        break;
      case '3':
        this.showProjectSettings();
        break;
      case '4':
        this.shareProject();
        break;
      default:
        if (action) this.showMessage('Invalid option selected');
    }
  }

  duplicateProject(): void {
    const newName = prompt('Enter name for duplicated project:', `${this.currentProjectName} - Copy`);
    if (newName && newName.trim()) {
      const newId = this.generateGuid();
      localStorage.setItem(`project_${newId}`, JSON.stringify({
        name: newName.trim(),
        clips: [...this.clips],
        lastSaved: new Date().toISOString()
      }));
      this.showMessage(`Project duplicated as "${newName}"`);
    }
  }

  deleteProject(): void {
    if (confirm(`Are you sure you want to delete project "${this.currentProjectName}"?`)) {
      localStorage.removeItem(`project_${this.currentProjectId}`);
      this.showMessage('Project deleted');
      this.createNewProject();
    }
  }

  showProjectSettings(): void {
    const newName = prompt('Project Name:', this.currentProjectName);
    if (newName && newName.trim() && newName !== this.currentProjectName) {
      this.currentProjectName = newName.trim();
      this.showMessage('Project settings updated');
    }
  }

  shareProject(): void {
    const shareUrl = `${window.location.origin}/studio?project=${this.currentProjectId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      this.showMessage('Share link copied to clipboard!');
    }).catch(() => {
      prompt('Copy this share link:', shareUrl);
    });
  }

  // Export functions
  closeExportModal(): void {
    this.showExportModal = false;
  }

  performExport(): void {
    this.showMessage('Starting export...');
    this.showExportModal = false;
    
    // Simulate export process
    setTimeout(() => {
      this.showMessage('Export completed successfully!');
    }, 2000);
  }

  // Clip management functions
  deleteSelectedClip(): void {
    if (this.selectedClipId) {
      this.saveStateForUndo();
      this.clips = this.clips.filter(clip => clip.id !== this.selectedClipId);
      this.showMessage('Clip deleted');
      this.selectedClipId = null;
    } else {
      this.showMessage('No clip selected');
    }
  }

  selectClip(clipId: string): void {
    this.selectedClipId = clipId;
    const clip = this.clips.find(c => c.id === clipId);
    if (clip) {
      this.showMessage(`Selected: ${clip.name}`);
    }
  }

  // Core editing functions
  cutClip(clipId: string, time: number): void {
    this.saveStateForUndo();
    const clipIndex = this.clips.findIndex(c => c.id === clipId);
    if (clipIndex !== -1) {
      const clip = this.clips[clipIndex];
      if (time > clip.startTime && time < clip.endTime) {
        // Create two new clips
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
        this.showMessage(`Clip cut at ${this.formatTime(time)}`);
      }
    }
  }

  splitClip(clipId: string, time: number): void {
    this.cutClip(clipId, time); // Same functionality as cut
  }

  trimClip(clipId: string, newStartTime: number, newEndTime: number): void {
    this.saveStateForUndo();
    const clip = this.clips.find(c => c.id === clipId);
    if (clip) {
      clip.startTime = newStartTime;
      clip.endTime = newEndTime;
      clip.duration = newEndTime - newStartTime;
      this.showMessage(`Clip trimmed`);
    }
  }

  changeClipSpeed(clipId: string, speedMultiplier: number): void {
    this.saveStateForUndo();
    const clip = this.clips.find(c => c.id === clipId);
    if (clip) {
      clip.duration = clip.duration / speedMultiplier;
      clip.endTime = clip.startTime + clip.duration;
      this.showMessage(`Clip speed changed to ${speedMultiplier}x`);
    }
  }

  // Drag and drop functionality
  drop(event: CdkDragDrop<any>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      this.saveStateForUndo();
      const effectData = event.item.data;
      const targetTrack = event.container.data;
      
      const newClip: Clip = {
        id: `effect-${Date.now()}`,
        name: effectData.name,
        type: 'effect',
        startTime: 0,
        endTime: 60,
        duration: 60,
        effectType: effectData.effectType,
        track: targetTrack
      };

      this.clips.push(newClip);
      this.clips.sort((a, b) => a.track - b.track || a.startTime - b.startTime);
      this.showMessage(`Applied effect: ${newClip.name} to track ${newClip.track + 1}`);
    }
  }

  // Media bin event handlers
  onMediaBinMediaSelected(media: MediaDto): void {
    this.showMessage(`Media selected: ${media.title}`);
  }

  onMediaBinMediaDeleted(mediaId: string): void {
    this.clips = this.clips.filter(clip => clip.mediaId !== mediaId);
    this.showMessage('Media deleted from project');
  }

  onMediaBinMediaEdited(media: MediaDto): void {
    const clipToUpdate = this.clips.find(clip => clip.mediaId === media.id);
    if (clipToUpdate) {
      clipToUpdate.name = media.title || 'Untitled Media';
      clipToUpdate.src = media.video || `https://via.placeholder.com/100x50?text=${media.title}`;
      this.showMessage('Media updated');
    }
  }

  onMediaBinMediaUploaded(media: MediaDto): void {
    this.saveStateForUndo();
    const newClip: Clip = {
      id: `clip-${media.id}`,
      name: media.title || 'Untitled Media',
      type: 'video',
      startTime: 0,
      endTime: 10,
      duration: 10,
      src: media.video || `https://via.placeholder.com/100x50?text=${media.title}`,
      mediaId: media.id,
      track: 1
    };
    this.clips.push(newClip);
    this.clips.sort((a, b) => a.track - b.track || a.startTime - b.startTime);
    this.showMessage(`New media added: ${newClip.name}`);
  }

  // Video management methods
  loadProjectVideos(): void {
    this.mediaService.getProjectMedias(this.currentProjectId).subscribe({
      next: (videos: MediaDto[]) => {
        this.projectVideos = videos;
        console.log('Loaded project videos:', videos);
      },
      error: (error) => {
        console.error('Failed to load project videos:', error);
        this.showMessage('Failed to load project videos');
      }
    });
  }

  selectVideoForTimeline(video: MediaDto): void {
    this.selectedVideoForPreview = video.video || '';
    this.showMessage(`Selected video: ${video.title}`);
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
      startTime: 0,
      endTime: 30, // Default 30 seconds
      duration: 30,
      src: video.video || '',
      mediaId: video.id,
      track: 1 // Add to video track
    };

    this.clips.push(newClip);
    this.clips.sort((a, b) => a.track - b.track || a.startTime - b.startTime);
    this.showMessage(`Added "${video.title}" to timeline`);
  }

  navigateToCreateMedia(): void {
    this.router.navigate(['/media/create']);
  }

  // Video player event handlers
  onVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.totalDuration = video.duration;
    console.log('Video loaded, duration:', this.totalDuration);
  }

  onTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.currentTime = video.currentTime;
  }

  // Helper functions
  clipsByTrack(trackNum: number): Clip[] {
    return this.clips.filter(clip => clip.track === trackNum).sort((a, b) => a.startTime - b.startTime);
  }

  loadProjectMedia(projectId: string): void {
    this.mediaService.getProjectMedias(projectId).subscribe({
      next: (medias: MediaDto[]) => {
        const loadedClips: Clip[] = medias.map(media => ({
          id: `clip-${media.id}`,
          name: media.title || 'Untitled Media',
          type: 'video',
          startTime: 0,
          endTime: 10,
          duration: 10,
          src: `https://via.placeholder.com/100x50?text=${media.title}`,
          mediaId: media.id,
          track: 1
        }));
        this.clips = [...this.clips.filter(c => c.type !== 'video'), ...loadedClips];
        this.clips.sort((a, b) => a.track - b.track || a.startTime - b.startTime);
      },
      error: (error) => {
        console.error(`Failed to load media for project ${projectId}:`, error);
      }
    });
  }

  private saveStateForUndo(): void {
    this.undoStack.push([...this.clips]);
    this.redoStack = []; // Clear redo stack when new action is performed
    
    // Limit undo stack size
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0,
        v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private showMessage(message: string): void {
    // Create a simple toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  // Getter for formatted current time
  get formattedCurrentTime(): string {
    return this.formatTime(this.currentTime);
  }

  // Getter for formatted total duration
  get formattedTotalDuration(): string {
    return this.formatTime(this.totalDuration);
  }

  // Getter for play button icon
  get playButtonIcon(): string {
    return this.isPlaying ? '⏸️' : '▶️';
  }
}