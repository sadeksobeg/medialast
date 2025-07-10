import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AdvancedTimelineService } from '../../services/advanced-timeline.service';
import { Effect, EffectType, EffectParameter, Clip } from '../../models/advanced-studio.models';

interface EffectPreset {
  id: string;
  name: string;
  type: EffectType;
  description: string;
  thumbnail: string;
  parameters: EffectParameter[];
  category: string;
}

@Component({
  selector: 'app-effects-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="effects-panel">
      <div class="effects-header">
        <h3>Effects & Filters</h3>
        <div class="effects-search">
          <input 
            type="text" 
            placeholder="Search effects..."
            [(ngModel)]="searchQuery"
            (input)="filterEffects()"
            class="search-input"
          />
        </div>
      </div>

      <div class="effects-categories">
        <button 
          class="category-btn"
          *ngFor="let category of categories"
          [class.active]="selectedCategory === category"
          (click)="selectCategory(category)"
        >
          {{ category }}
        </button>
      </div>

      <div class="effects-content">
        <!-- Available Effects -->
        <div class="effects-library">
          <h4>Available Effects</h4>
          <div class="effects-grid">
            <div 
              class="effect-preset"
              *ngFor="let preset of filteredPresets"
              (click)="applyEffect(preset)"
              [title]="preset.description"
            >
              <div class="effect-thumbnail">
                <img [src]="preset.thumbnail" [alt]="preset.name" />
                <div class="effect-overlay">
                  <i class="icon-plus"></i>
                </div>
              </div>
              <div class="effect-name">{{ preset.name }}</div>
            </div>
          </div>
        </div>

        <!-- Applied Effects -->
        <div class="applied-effects" *ngIf="selectedClips.length > 0">
          <h4>Applied Effects ({{ selectedClips.length }} clip{{ selectedClips.length > 1 ? 's' : '' }})</h4>
          <div class="effects-list">
            <div 
              class="applied-effect"
              *ngFor="let effect of getSelectedClipEffects(); trackBy: trackByEffectId"
            >
              <div class="effect-header">
                <div class="effect-info">
                  <span class="effect-title">{{ effect.name }}</span>
                  <span class="effect-type">{{ effect.type }}</span>
                </div>
                <div class="effect-controls">
                  <button 
                    class="effect-btn"
                    [class.active]="effect.enabled"
                    (click)="toggleEffect(effect)"
                    title="Toggle Effect"
                  >
                    <i class="icon-power"></i>
                  </button>
                  <button 
                    class="effect-btn"
                    (click)="removeEffect(effect)"
                    title="Remove Effect"
                  >
                    <i class="icon-trash"></i>
                  </button>
                </div>
              </div>

              <div class="effect-parameters" *ngIf="effect.enabled">
                <div 
                  class="parameter"
                  *ngFor="let param of effect.parameters; trackBy: trackByParameterId"
                >
                  <label class="parameter-label">{{ param.name }}</label>
                  
                  <!-- Number Parameter -->
                  <div class="parameter-control" *ngIf="param.type === 'number'">
                    <input 
                      type="range"
                      [min]="param.min || 0"
                      [max]="param.max || 100"
                      [step]="param.step || 1"
                      [(ngModel)]="param.value"
                      (input)="updateParameter(effect, param)"
                      class="range-slider"
                    />
                    <input 
                      type="number"
                      [min]="param.min || 0"
                      [max]="param.max || 100"
                      [step]="param.step || 1"
                      [(ngModel)]="param.value"
                      (input)="updateParameter(effect, param)"
                      class="number-input"
                    />
                  </div>

                  <!-- Boolean Parameter -->
                  <div class="parameter-control" *ngIf="param.type === 'boolean'">
                    <label class="checkbox-label">
                      <input 
                        type="checkbox"
                        [(ngModel)]="param.value"
                        (change)="updateParameter(effect, param)"
                      />
                      <span class="checkmark"></span>
                    </label>
                  </div>

                  <!-- Color Parameter -->
                  <div class="parameter-control" *ngIf="param.type === 'color'">
                    <input 
                      type="color"
                      [(ngModel)]="param.value"
                      (input)="updateParameter(effect, param)"
                      class="color-picker"
                    />
                    <input 
                      type="text"
                      [(ngModel)]="param.value"
                      (input)="updateParameter(effect, param)"
                      class="color-text"
                      placeholder="#000000"
                    />
                  </div>

                  <!-- Text Parameter -->
                  <div class="parameter-control" *ngIf="param.type === 'text'">
                    <input 
                      type="text"
                      [(ngModel)]="param.value"
                      (input)="updateParameter(effect, param)"
                      class="text-input"
                    />
                  </div>

                  <!-- Select Parameter -->
                  <div class="parameter-control" *ngIf="param.type === 'select'">
                    <select 
                      [(ngModel)]="param.value"
                      (change)="updateParameter(effect, param)"
                      class="select-input"
                    >
                      <option *ngFor="let option of param.options" [value]="option">
                        {{ option }}
                      </option>
                    </select>
                  </div>

                  <!-- Keyframe Button -->
                  <button 
                    class="keyframe-btn"
                    *ngIf="param.animatable"
                    [class.active]="hasKeyframe(effect, param)"
                    (click)="toggleKeyframe(effect, param)"
                    title="Add/Remove Keyframe"
                  >
                    <i class="icon-keyframe"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Selection Message -->
        <div class="no-selection" *ngIf="selectedClips.length === 0">
          <div class="no-selection-icon">
            <i class="icon-effects-large"></i>
          </div>
          <h4>No Clips Selected</h4>
          <p>Select one or more clips to apply effects</p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./effects-panel.component.scss']
})
export class EffectsPanelComponent implements OnInit, OnDestroy {
  searchQuery = '';
  selectedCategory = 'All';
  selectedClips: string[] = [];
  
  categories = [
    'All', 'Color', 'Blur & Sharpen', 'Distortion', 
    'Artistic', 'Audio', 'Transition', 'Generator'
  ];

  effectPresets: EffectPreset[] = [
    // Color Effects
    {
      id: 'brightness-contrast',
      name: 'Brightness/Contrast',
      type: EffectType.COLOR_CORRECTION,
      description: 'Adjust brightness and contrast',
      thumbnail: '/assets/effects/brightness-contrast.jpg',
      category: 'Color',
      parameters: [
        { id: 'brightness', name: 'Brightness', type: 'number', value: 0, min: -100, max: 100, animatable: true, step: 1, options: [] },
        { id: 'contrast', name: 'Contrast', type: 'number', value: 0, min: -100, max: 100, animatable: true, step: 1, options: [] }
      ]
    },
    {
      id: 'color-balance',
      name: 'Color Balance',
      type: EffectType.COLOR_CORRECTION,
      description: 'Adjust color balance',
      thumbnail: '/assets/effects/color-balance.jpg',
      category: 'Color',
      parameters: [
        { id: 'shadows', name: 'Shadows', type: 'number', value: 0, min: -100, max: 100, animatable: true, step: 1, options: [] },
        { id: 'midtones', name: 'Midtones', type: 'number', value: 0, min: -100, max: 100, animatable: true, step: 1, options: [] },
        { id: 'highlights', name: 'Highlights', type: 'number', value: 0, min: -100, max: 100, animatable: true, step: 1, options: [] }
      ]
    },
    {
      id: 'saturation',
      name: 'Saturation',
      type: EffectType.COLOR_CORRECTION,
      description: 'Adjust color saturation',
      thumbnail: '/assets/effects/saturation.jpg',
      category: 'Color',
      parameters: [
        { id: 'saturation', name: 'Saturation', type: 'number', value: 100, min: 0, max: 200, animatable: true, step: 1, options: [] }
      ]
    },
    
    // Blur & Sharpen
    {
      id: 'gaussian-blur',
      name: 'Gaussian Blur',
      type: EffectType.BLUR,
      description: 'Apply gaussian blur',
      thumbnail: '/assets/effects/gaussian-blur.jpg',
      category: 'Blur & Sharpen',
      parameters: [
        { id: 'radius', name: 'Radius', type: 'number', value: 5, min: 0, max: 50, animatable: true, step: 0.1, options: [] }
      ]
    },
    {
      id: 'motion-blur',
      name: 'Motion Blur',
      type: EffectType.BLUR,
      description: 'Apply motion blur',
      thumbnail: '/assets/effects/motion-blur.jpg',
      category: 'Blur & Sharpen',
      parameters: [
        { id: 'angle', name: 'Angle', type: 'number', value: 0, min: 0, max: 360, animatable: true, step: 1, options: [] },
        { id: 'distance', name: 'Distance', type: 'number', value: 10, min: 0, max: 100, animatable: true, step: 1, options: [] }
      ]
    },
    {
      id: 'sharpen',
      name: 'Sharpen',
      type: EffectType.SHARPEN,
      description: 'Sharpen image',
      thumbnail: '/assets/effects/sharpen.jpg',
      category: 'Blur & Sharpen',
      parameters: [
        { id: 'amount', name: 'Amount', type: 'number', value: 50, min: 0, max: 200, animatable: true, step: 1, options: [] }
      ]
    },

    // Audio Effects
    {
      id: 'equalizer',
      name: 'Equalizer',
      type: EffectType.AUDIO_EQ,
      description: 'Audio equalizer',
      thumbnail: '/assets/effects/equalizer.jpg',
      category: 'Audio',
      parameters: [
        { id: 'low', name: 'Low', type: 'number', value: 0, min: -20, max: 20, animatable: true, step: 0.1, options: [] },
        { id: 'mid', name: 'Mid', type: 'number', value: 0, min: -20, max: 20, animatable: true, step: 0.1, options: [] },
        { id: 'high', name: 'High', type: 'number', value: 0, min: -20, max: 20, animatable: true, step: 0.1, options: [] }
      ]
    },
    {
      id: 'compressor',
      name: 'Compressor',
      type: EffectType.AUDIO_COMPRESSOR,
      description: 'Audio compressor',
      thumbnail: '/assets/effects/compressor.jpg',
      category: 'Audio',
      parameters: [
        { id: 'threshold', name: 'Threshold', type: 'number', value: -20, min: -60, max: 0, animatable: true, step: 1, options: [] },
        { id: 'ratio', name: 'Ratio', type: 'number', value: 4, min: 1, max: 20, animatable: true, step: 0.1, options: [] },
        { id: 'attack', name: 'Attack', type: 'number', value: 10, min: 0, max: 100, animatable: true, step: 1, options: [] },
        { id: 'release', name: 'Release', type: 'number', value: 100, min: 0, max: 1000, animatable: true, step: 10, options: [] }
      ]
    }
  ];

  filteredPresets: EffectPreset[] = [];

  private destroy$ = new Subject<void>();

  constructor(private timelineService: AdvancedTimelineService) {}

  ngOnInit(): void {
    this.filteredPresets = [...this.effectPresets];
    
    this.timelineService.selectedClips$
      .pipe(takeUntil(this.destroy$))
      .subscribe(selectedClips => {
        this.selectedClips = selectedClips;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.filterEffects();
  }

  filterEffects(): void {
    let filtered = this.effectPresets;

    // Filter by category
    if (this.selectedCategory !== 'All') {
      filtered = filtered.filter(preset => preset.category === this.selectedCategory);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(preset =>
        preset.name.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query)
      );
    }

    this.filteredPresets = filtered;
  }

  applyEffect(preset: EffectPreset): void {
    if (this.selectedClips.length === 0) {
      alert('Please select one or more clips to apply effects');
      return;
    }

    const effect: Effect = {
      id: this.generateId(),
      name: preset.name,
      type: preset.type,
      enabled: true,
      parameters: preset.parameters.map(p => ({ ...p })),
      keyframes: [],
      presetId: preset.id
    };

    // Apply to all selected clips
    this.selectedClips.forEach(clipId => {
      this.addEffectToClip(clipId, effect);
    });
  }

  private addEffectToClip(clipId: string, effect: Effect): void {
    const timeline = this.timelineService.timeline$.value;
    
    for (const track of timeline.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        clip.effects.push({ ...effect, id: this.generateId() });
        break;
      }
    }
  }

  getSelectedClipEffects(): Effect[] {
    if (this.selectedClips.length === 0) return [];
    
    const timeline = this.timelineService.timeline$.value;
    const effects: Effect[] = [];
    
    for (const track of timeline.tracks) {
      for (const clip of track.clips) {
        if (this.selectedClips.includes(clip.id)) {
          effects.push(...clip.effects);
        }
      }
    }
    
    return effects;
  }

  toggleEffect(effect: Effect): void {
    effect.enabled = !effect.enabled;
  }

  removeEffect(effect: Effect): void {
    if (confirm('Remove this effect?')) {
      const timeline = this.timelineService.timeline$.value;
      
      for (const track of timeline.tracks) {
        for (const clip of track.clips) {
          if (this.selectedClips.includes(clip.id)) {
            const index = clip.effects.findIndex(e => e.id === effect.id);
            if (index >= 0) {
              clip.effects.splice(index, 1);
            }
          }
        }
      }
    }
  }

  updateParameter(effect: Effect, parameter: EffectParameter): void {
    // Parameter value is updated via ngModel
    // Here we could trigger real-time preview updates
    console.log('Parameter updated:', parameter.name, parameter.value);
  }

  hasKeyframe(effect: Effect, parameter: EffectParameter): boolean {
    const currentTime = this.timelineService.playback$.value.position;
    return effect.keyframes.some(kf => 
      kf.parameterId === parameter.id && 
      Math.abs(kf.time - currentTime) < 0.1
    );
  }

  toggleKeyframe(effect: Effect, parameter: EffectParameter): void {
    const currentTime = this.timelineService.playback$.value.position;
    const existingIndex = effect.keyframes.findIndex(kf => 
      kf.parameterId === parameter.id && 
      Math.abs(kf.time - currentTime) < 0.1
    );

    if (existingIndex >= 0) {
      // Remove keyframe
      effect.keyframes.splice(existingIndex, 1);
    } else {
      // Add keyframe
      effect.keyframes.push({
        id: this.generateId(),
        time: currentTime,
        parameterId: parameter.id,
        value: parameter.value,
        interpolation: 'linear' as any,
        easing: 'ease' as any
      });
    }
  }

  trackByEffectId(index: number, effect: Effect): string {
    return effect.id;
  }

  trackByParameterId(index: number, parameter: EffectParameter): string {
    return parameter.id;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}