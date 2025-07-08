import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MediaService } from '../proxy/medias/media.service';
import { MediaDto, CreateUpdateMediaDto } from '../proxy/medias/models';
import { MediaBinComponent } from './media-bin/media-bin.component'; // Import MediaBinComponent

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
  showExportModal: boolean = false;
  currentProjectName: string = 'My Awesome Video'; // Initial project name
  currentProjectId: string; // Current project ID, will be a GUID

  // Sample clips for the timeline
  clips: Clip[] = [
    { id: 'clip1', name: 'Retro Shake 3', type: 'effect', startTime: 0, endTime: 60, duration: 60, effectType: 'retro-shake-3', track: 0 },
    { id: 'clip2', name: 'Video Clip 1', type: 'video', startTime: 30, endTime: 120, duration: 90, src: 'https://via.placeholder.com/100x50', track: 1 },
    { id: 'clip3', name: 'Diamond', type: 'effect', startTime: 90, endTime: 180, duration: 90, effectType: 'diamond-effect', track: 2 },
    { id: 'clip4', name: 'Play Day', type: 'effect', startTime: 150, endTime: 240, duration: 90, effectType: 'play-day-effect', track: 3 },
  ];

  constructor(private mediaService: MediaService) {
    this.currentProjectId = this.generateGuid(); // Initialize in constructor
  }

  ngOnInit(): void {
    console.log('ngOnInit: currentProjectId before loading media:', this.currentProjectId);
    this.loadProjectMedia(this.currentProjectId);
  }

  onMediaBinMediaSelected(media: MediaDto): void {
    console.log('Media selected from media bin:', media);
    // Handle media selection, e.g., add to timeline or preview
  }

  onMediaBinMediaDeleted(mediaId: string): void {
    console.log('Media deleted from media bin:', mediaId);
    this.clips = this.clips.filter(clip => clip.mediaId !== mediaId);
  }

  onMediaBinMediaEdited(media: MediaDto): void {
    console.log('Media edited in media bin:', media);
    const clipToUpdate = this.clips.find(clip => clip.mediaId === media.id);
    if (clipToUpdate) {
      clipToUpdate.name = media.title;
      clipToUpdate.src = media.video || `https://via.placeholder.com/100x50?text=${media.title}`;
    }
  }

  onMediaBinMediaUploaded(media: MediaDto): void {
    console.log('New media uploaded via media bin:', media);
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
  }

  onNavClick(item: string): void {
    this.activeNavItem = item;
    if (item === 'effects') {
      this.isEffectsPanelExpanded = !this.isEffectsPanelExpanded;
    } else {
      this.isEffectsPanelExpanded = false;
    }
    console.log(`Navigation item clicked: ${item}`);
  }

  onHeaderButtonClick(buttonName: string): void {
    console.log(`Header button clicked: ${buttonName}`);
    if (buttonName === 'export') {
      this.showExportModal = true;
    } else if (buttonName === 'undo') {
      alert('Undo action triggered!');
      // Implement undo logic here
    } else if (buttonName === 'redo') {
      alert('Redo action triggered!');
      // Implement redo logic here
    } else if (buttonName === 'new-project') {
      this.createNewProject();
    } else if (buttonName === 'save-project') {
      this.saveProject();
    }
  }

  onPlayerControlClick(controlName: string): void {
    console.log(`Player control clicked: ${controlName}`);
    if (controlName === 'play') {
      alert('Play/Pause video!');
      // Implement play/pause logic
    } else if (controlName === 'minus') {
      alert('Zoom out timeline!');
      // Implement timeline zoom out
    } else if (controlName === 'plus') {
      alert('Zoom in timeline!');
      // Implement timeline zoom in
    } else if (controlName === 'trash') {
      alert('Delete selected clip!');
      // Implement delete clip logic
    }
  }

  closeExportModal(): void {
    this.showExportModal = false;
    console.log('Export modal closed.');
  }

  performExport(): void {
    alert('Exporting video...');
    this.showExportModal = false;
    console.log('Export initiated.');
  }

  // Helper to filter clips by track for ngFor
  clipsByTrack(trackNum: number): Clip[] {
    return this.clips.filter(clip => clip.track === trackNum).sort((a, b) => a.startTime - b.startTime);
  }

  // Drag and Drop functionality for effects
  drop(event: CdkDragDrop<Clip[]>) {
    if (event.previousContainer === event.container) {
      // Reordering within the same track (not implemented for clips yet, but good for future)
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Dropping an effect from the effects library onto a timeline track
      const effectData = event.previousContainer.data[event.previousIndex];
      const targetTrack = event.container.data as any; // The track number
      
      // Create a new clip for the dropped effect
      const newClip: Clip = {
        id: `effect-${Date.now()}`, // Unique ID
        name: effectData.name,
        type: 'effect',
        startTime: 0, // Placeholder, ideally determined by drop position
        endTime: 60,  // Placeholder duration
        duration: 60,
        effectType: effectData.effectType,
        track: targetTrack // Assign to the target track
      };

      this.clips.push(newClip);
      console.log(`Dropped effect: ${newClip.name} onto track ${newClip.track}`);
      alert(`Applied effect: ${newClip.name} to track ${newClip.track}`);
      // You might want to sort clips after adding a new one
      this.clips.sort((a, b) => a.track - b.track || a.startTime - b.startTime);
    }
  }

  // Project Management Functions
  createNewProject(): void {
    const newName = prompt('Enter new project name:', 'New Project');
    if (newName) {
      this.currentProjectName = newName;
      this.currentProjectId = `project-${Date.now()}`; // Generate a new project ID
      this.clips = []; // Clear existing clips for a new project
      alert(`New project "${newName}" created!`);
      console.log(`New project created: ${newName} with ID: ${this.currentProjectId}`);
    }
  }

  saveProject(): void {
    // In a real application, this would save `this.clips` and other project data
    alert(`Project "${this.currentProjectName}" saved!`);
    console.log(`Project saved: ${this.currentProjectName}`);
  }


  // Load project media from backend
  loadProjectMedia(projectId: string): void {
    this.mediaService.getProjectMedias(projectId).subscribe({
      next: (medias: MediaDto[]) => {
        console.log(`Loaded ${medias.length} media items for project ${projectId}:`, medias);
        // Convert MediaDto to Clip and add to clips array
        const loadedClips: Clip[] = medias.map(media => ({
          id: `clip-${media.id}`,
          name: media.title || 'Untitled Media',
          type: 'video', // Assuming all loaded are videos for now
          startTime: 0, // Placeholder
          endTime: 10,  // Placeholder
          duration: 10, // Placeholder
          src: `https://via.placeholder.com/100x50?text=${media.title}`, // Placeholder src
          mediaId: media.id,
          track: 1 // Default track
        }));
        this.clips = [...this.clips.filter(c => c.type !== 'video'), ...loadedClips]; // Keep effects, replace videos
        this.clips.sort((a, b) => a.track - b.track || a.startTime - b.startTime);
      },
      error: (error) => {
        console.error(`Failed to load media for project ${projectId}:`, error);
        // Handle error, e.g., show a message to the user
      }
    });
  }

  // Core Editing Tools Placeholders
  cutClip(clipId: string, time: number): void {
    console.log(`Cutting clip ${clipId} at ${time} seconds.`);
    alert(`Cutting clip ${clipId} at ${time} seconds.`);
    // Logic to split the clip into two
  }

  splitClip(clipId: string, time: number): void {
    console.log(`Splitting clip ${clipId} at ${time} seconds.`);
    alert(`Splitting clip ${clipId} at ${time} seconds.`);
    // Logic to split the clip into two
  }

  trimClip(clipId: string, newStartTime: number, newEndTime: number): void {
    console.log(`Trimming clip ${clipId} from ${newStartTime} to ${newEndTime} seconds.`);
    alert(`Trimming clip ${clipId} from ${newStartTime} to ${newEndTime} seconds.`);
    // Logic to adjust clip start/end times
  }

  changeClipSpeed(clipId: string, speedMultiplier: number): void {
    console.log(`Changing speed of clip ${clipId} to ${speedMultiplier}x.`);
    alert(`Changing speed of clip ${clipId} to ${speedMultiplier}x.`);
    // Logic to adjust clip playback speed
  }
  // Helper function to generate a GUID (Globally Unique Identifier)
  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0,
        v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
