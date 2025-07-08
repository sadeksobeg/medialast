import { Component, OnInit } from '@angular/core';
import { PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { MediaDto, MediaService } from '@proxy/medias';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Import RouterModule
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel
import Swal from 'sweetalert2'; // Import Swal
import { Router } from '@angular/router';

@Component({
  selector: 'app-list-medias',
  imports: [CommonModule, RouterModule, FormsModule], // Add FormsModule here
  templateUrl: './list-medias.component.html',
  styleUrls: ['./list-medias.component.scss']
})
export class ListMediasComponent implements OnInit {
  media: MediaDto[] = [];
  projectVideos: MediaDto[] = [];
  filteredVideos: MediaDto[] = [];
  selectedMedia: MediaDto | null = null;
  showVideoModal: boolean = false;
  showVideoPreviewModal: boolean = false;
  showAudioToolsModal: boolean = false;
  showExportModal: boolean = false;
  isLoading: boolean = false;
  isVideoLoading: boolean = false;
  videoError: boolean = false;
  videoErrorMessage: string = '';
  videoUrl: string = '';
  selectedVideoForPreview: string = '';
  previewingVideo: MediaDto | null = null;
  
  // Navigation state
  activeNavItem: string = 'media';
  isAudioPanelExpanded: boolean = false;
  isEffectsPanelExpanded: boolean = false;
  isTextPanelExpanded: boolean = false;
  isCaptionsPanelExpanded: boolean = false;
  
  // Project state
  currentProjectName: string = 'Untitled Project';
  
  // Playback state
  isPlaying: boolean = false;
  currentTime: number = 0;
  totalDuration: number = 240;
  
  // Timeline state
  zoomLevel: number = 100;
  timelineZoom: number = 100;
  selectedClipId: string | null = null;
  videoTracks: number[] = [0, 1, 2];
  audioTracks: number[] = [0, 1, 2, 3];
  timeMarkers: string[] = ['00:00', '01:00', '02:00', '03:00', '04:00'];
  
  // Undo/Redo
  undoStack: any[][] = [[]];
  redoStack: any[][] = [];
  
  // Audio tools
  currentAudioTool: any = null;
  
  // Export settings
  exportSettings = {
    format: 'mp4',
    quality: '1080p',
    frameRate: '30',
    bitrate: 10
  };
  
  videoMetadata = {
    duration: 0,
    resolution: ''
  };
  
  input: PagedAndSortedResultRequestDto = {
    maxResultCount: 10,
    skipCount: 0,
    sorting: ''
  };

  // Language mapping for better display
  private languageMap: { [key: string]: string } = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi'
  };

  constructor(
    private mediasService: MediaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMedia();
  }

  // Navigation methods
  onNavClick(item: string): void {
    this.activeNavItem = item;
    
    // Reset all panel states
    this.isAudioPanelExpanded = false;
    this.isEffectsPanelExpanded = false;
    this.isTextPanelExpanded = false;
    this.isCaptionsPanelExpanded = false;
    
    // Set active panel
    switch (item) {
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
  }

  // Header actions
  onHeaderButtonClick(buttonName: string): void {
    switch (buttonName) {
      case 'save-project':
        this.showMessage('Project saved!', 'success');
        break;
      case 'new-project':
        this.showMessage('New project created!', 'success');
        break;
      case 'export':
        this.showExportModal = true;
        break;
      case 'share':
        this.showMessage('Share link copied!', 'success');
        break;
      case 'settings':
        this.showMessage('Settings opened!', 'info');
        break;
      default:
        console.log(`Header button clicked: ${buttonName}`);
    }
  }

  // Playback controls
  togglePlayPause(): void {
    this.isPlaying = !this.isPlaying;
    this.showMessage(this.isPlaying ? 'Playing' : 'Paused');
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
    // Update timeline zoom
  }

  fitTimelineToWindow(): void {
    this.timelineZoom = 100;
    this.showMessage('Timeline fitted to window');
  }

  // Clip management
  splitAtCurrentTime(): void {
    this.showMessage('Split at current time');
  }

  extractAudio(): void {
    this.showMessage('Audio extracted');
  }

  deleteSelectedClip(): void {
    this.showMessage('Clip deleted');
  }

  // Undo/Redo
  undo(): void {
    this.showMessage('Undid last action');
  }

  redo(): void {
    this.showMessage('Redid last action');
  }

  // Video preview methods
  closeVideoPreview(): void {
    this.showVideoPreviewModal = false;
    this.previewingVideo = null;
  }

  addVideoToTimeline(video: MediaDto): void {
    this.showMessage(`Added "${video.title}" to timeline`);
  }

  // Audio tools
  closeAudioToolsModal(): void {
    this.showAudioToolsModal = false;
    this.currentAudioTool = null;
  }

  // Export
  closeExportModal(): void {
    this.showExportModal = false;
  }

  performExport(): void {
    this.showMessage('Starting export...', 'info');
    this.showExportModal = false;
  }

  loadMedia(): void {
    this.isLoading = true;
    this.mediasService.getList(this.input).subscribe({
      next: response => {
        this.isLoading = false;
        console.log('Media List API Response:', response);
        if (response && response.items) {
          this.media = response.items;
          this.projectVideos = response.items;
          this.filteredVideos = response.items;
          console.log('Loaded media items:', this.media.length);
          
          // Debug: Log each media item
          this.media.forEach((item, index) => {
            console.log(`Media ${index + 1}:`, {
              id: item.id,
              title: item.title,
              hasVideo: !!item.video,
              videoUrl: item.video,
              description: item.description
            });
          });
        } else {
          console.log('No items in the media list response');
        }
      },
      error: error => {
        this.isLoading = false;
        console.error('Error fetching media list:', error);
        this.showMessage('Failed to load media list', 'error');
      }
    });
  }

  loadMore(): void {
    this.isLoading = true;
    this.input.skipCount += this.input.maxResultCount;
    this.mediasService.getList(this.input).subscribe({
      next: response => {
        this.isLoading = false;
        console.log('Load More Media API Response:', response);
        this.media = [...this.media, ...response.items];
      },
      error: error => {
        this.isLoading = false;
        console.error('Error loading more media:', error);
        this.showMessage('Failed to load more media', 'error');
      }
    });
  }

  deleteMedia(mediaId: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.mediasService.delete(mediaId).subscribe({
          next: () => {
            this.media = this.media.filter(m => m.id !== mediaId);
            Swal.fire('Deleted!', 'The media has been deleted.', 'success');
          },
          error: (err) => {
            Swal.fire('Error', 'Something went wrong while deleting.', 'error');
            console.error('Delete failed:', err);
          }
        });
      }
    });
  }

  viewMedia(media: MediaDto): void {
    console.log('Viewing media:', media);
    console.log('Video URL:', media.video);
    
    // Debug: Check if video URL exists and is valid
    if (!media.video) {
      console.warn('No video URL found for media:', media);
      this.showMessage('No video URL available for this media', 'warning');
    } else if (media.video.trim() === '') {
      console.warn('Empty video URL for media:', media);
      this.showMessage('Video URL is empty', 'warning');
    } else {
      console.log('Video URL appears to be valid:', media.video);
    }
    
    this.selectedMedia = media;
    this.showVideoModal = true;
    this.resetVideoMetadata();
    this.resetVideoState();
    
    // Try to load video using the download endpoint
    this.loadVideoFromBackend(media.id);
  }

  private loadVideoFromBackend(mediaId: string): void {
    this.isVideoLoading = true;
    this.videoError = false;
    
    // First try to get video via download endpoint
    this.mediasService.downloadVideo(mediaId).subscribe({
      next: (videoBlob: Blob) => {
        console.log('Video downloaded successfully:', videoBlob);
        
        // Create a blob URL for the video
        this.videoUrl = URL.createObjectURL(videoBlob);
        this.isVideoLoading = false;
        
        // Force video element to reload with new URL
        setTimeout(() => {
          const videoElement = document.querySelector('.modal-video-player') as HTMLVideoElement;
          if (videoElement) {
            videoElement.src = this.videoUrl;
            videoElement.load();
          }
        }, 100);
      },
      error: (error) => {
        console.error('Failed to download video:', error);
        
        // Fallback: try to use the direct video URL if available
        if (this.selectedMedia?.video && this.selectedMedia.video.trim() !== '') {
          console.log('Falling back to direct video URL:', this.selectedMedia.video);
          this.videoUrl = this.selectedMedia.video;
          this.isVideoLoading = false;
          
          setTimeout(() => {
            const videoElement = document.querySelector('.modal-video-player') as HTMLVideoElement;
            if (videoElement) {
              videoElement.src = this.videoUrl;
              videoElement.load();
            }
          }, 100);
        } else {
          this.isVideoLoading = false;
          this.videoError = true;
          this.videoErrorMessage = 'No video available for this media item';
          this.showMessage('Failed to load video: No video source available', 'error');
        }
      }
    });
  }

  downloadVideo(): void {
    if (!this.selectedMedia) return;
    
    this.showMessage('Starting download...', 'info');
    
    this.mediasService.downloadVideo(this.selectedMedia.id).subscribe({
      next: (videoBlob: Blob) => {
        // Create download link
        const url = URL.createObjectURL(videoBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.selectedMedia?.title || 'video'}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showMessage('Video downloaded successfully!', 'success');
      },
      error: (error) => {
        console.error('Download failed:', error);
        this.showMessage('Failed to download video', 'error');
      }
    });
  }

  closeVideoModal(): void {
    this.showVideoModal = false;
    this.selectedMedia = null;
    
    // Clean up blob URL to prevent memory leaks
    if (this.videoUrl && this.videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.videoUrl);
    }
    this.videoUrl = '';
    
    this.resetVideoMetadata();
    this.resetVideoState();
  }

  editSelectedMedia(): void {
    if (this.selectedMedia) {
      this.router.navigate(['/media/edit', this.selectedMedia.id]);
      this.closeVideoModal();
    }
  }

  onVideoLoadStart(): void {
    this.isVideoLoading = true;
    this.videoError = false;
    this.videoErrorMessage = '';
  }

  onVideoCanPlay(): void {
    this.isVideoLoading = false;
  }

  onVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.isVideoLoading = false;
    this.videoMetadata.duration = video.duration;
    this.videoMetadata.resolution = `${video.videoWidth}x${video.videoHeight}`;
    console.log('Video loaded successfully:', {
      duration: video.duration,
      resolution: `${video.videoWidth}x${video.videoHeight}`,
      src: video.src
    });
  }

  onVideoError(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.isVideoLoading = false;
    this.videoError = true;
    
    // Get more specific error information
    const error = video.error;
    let errorMessage = 'Unknown error occurred';
    
    if (error) {
      switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
          errorMessage = 'Video loading was aborted';
          break;
        case error.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error occurred while loading video';
          break;
        case error.MEDIA_ERR_DECODE:
          errorMessage = 'Video format not supported or corrupted';
          break;
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video source not supported or not found';
          break;
        default:
          errorMessage = 'Unknown video error';
      }
    }
    
    this.videoErrorMessage = errorMessage;
    console.error('Video loading error:', {
      error: error,
      message: errorMessage,
      src: video.src,
      selectedMedia: this.selectedMedia
    });
    this.showMessage(`Failed to load video: ${errorMessage}`, 'error');
  }

  formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return 'Unknown';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getLanguageName(languageCode: string): string {
    return this.languageMap[languageCode] || languageCode || 'Not specified';
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

  getUrlType(url: string): string {
    if (!url) return 'Empty/Null';
    if (url.startsWith('http://') || url.startsWith('https://')) return 'HTTP URL';
    if (url.startsWith('blob:')) return 'Blob URL';
    if (url.startsWith('data:')) return 'Data URL';
    if (url.startsWith('/')) return 'Absolute Path';
    if (url.includes('://')) return 'Other Protocol';
    return 'Relative Path';
  }

  getMediaDebugInfo(media: MediaDto): string {
    return JSON.stringify({
      id: media.id,
      title: media.title,
      video: media.video,
      description: media.description,
      projectId: media.projectId,
      sourceLanguage: media.sourceLanguage,
      destinationLanguage: media.destinationLanguage,
      countryDialect: media.countryDialect
    }, null, 2);
  }

  testWithSampleVideo(): void {
    if (this.selectedMedia) {
      // Use a working sample video URL
      this.videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      this.resetVideoState();
      this.showMessage('Testing with sample video...', 'info');
      
      // Force video element to reload
      setTimeout(() => {
        const videoElement = document.querySelector('.modal-video-player') as HTMLVideoElement;
        if (videoElement) {
          videoElement.src = this.videoUrl;
          videoElement.load();
        }
      }, 100);
    }
  }

  onThumbnailLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    // Set video to first frame for thumbnail
    video.currentTime = 1;
    console.log('Thumbnail loaded for video:', video.src);
  }

  onThumbnailError(event: Event): void {
    const video = event.target as HTMLVideoElement;
    console.error('Thumbnail failed to load:', video.src);
    // Hide the video element on error
    video.style.display = 'none';
  }

  private resetVideoMetadata(): void {
    this.videoMetadata = {
      duration: 0,
      resolution: ''
    };
  }

  private resetVideoState(): void {
    this.isVideoLoading = false;
    this.videoError = false;
    this.videoErrorMessage = '';
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
}
