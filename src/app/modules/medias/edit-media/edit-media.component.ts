import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaService, MediaDto, CreateUpdateMediaDto } from '@proxy/medias';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-media',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-media.component.html',
  styleUrl: './edit-media.component.scss'
})
export class EditMediaComponent implements OnInit {
  mediaId!: string;
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mediasService: MediaService
  ) {}

  ngOnInit(): void {
    this.mediaId = this.route.snapshot.paramMap.get('id')!;
    this.mediasService.get(this.mediaId).subscribe((data: MediaDto) => {
      this.media = {
        title: data.title,
        description: data.description,
        video: data.video,
        metaData: data.metaData,
        projectId: data.projectId,
        sourceLanguage: data.sourceLanguage,
        destinationLanguage: data.destinationLanguage,
        countryDialect: data.countryDialect
      };
    });
  }

  update(): void {
    this.mediasService.update(this.mediaId, this.media).subscribe(() => {
      this.router.navigate(['/media']); // Navigate back to media list
    });
  }
}
