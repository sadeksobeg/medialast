import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MediaService, CreateUpdateMediaDto } from '@proxy/medias';
import { ProjectService, ProjectDto } from '@proxy/projects';

@Component({
  selector: 'app-create-media',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-media.component.html',
  styleUrl: './create-media.component.scss'
})
export class CreateMediaComponent implements OnInit {
  media: CreateUpdateMediaDto = {
    title: '',
    description: '',
    video: '',
    metaData: '',
    projectId: '',
    sourceLanguage: '',
    destinationLanguage: '',
    countryDialect: ''
  };

  projects: ProjectDto[] = [];
  isLoadingProjects: boolean = false;

  constructor(
    private mediasService: MediaService, 
    private projectService: ProjectService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoadingProjects = true;
    this.projectService.getList({
      maxResultCount: 100,
      skipCount: 0,
      sorting: 'title'
    }).subscribe({
      next: (response) => {
        this.projects = response.items || [];
        this.isLoadingProjects = false;
        
        // Auto-select first project if available
        if (this.projects.length > 0 && !this.media.projectId) {
          this.media.projectId = this.projects[0].id;
        }
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.isLoadingProjects = false;
        // Show user-friendly error message
        alert('Failed to load projects. Please try again.');
      }
    });
  }

  submit() {
    if (!this.media.projectId) {
      alert('Please select a project');
      return;
    }

    if (!this.media.title.trim()) {
      alert('Please enter a title');
      return;
    }

    this.mediasService.create(this.media).subscribe({
      next: () => {
        this.router.navigate(['/media']);
      },
      error: (error) => {
        console.error('Error creating media:', error);
        alert('Failed to create media. Please try again.');
      }
    });
  }

  onProjectChange(): void {
    // Optional: Handle project selection change
    const selectedProject = this.projects.find(p => p.id === this.media.projectId);
    if (selectedProject) {
      console.log('Selected project:', selectedProject.title);
    }
  }
}