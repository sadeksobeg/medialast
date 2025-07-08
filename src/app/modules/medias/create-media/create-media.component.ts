import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MediaService, CreateUpdateMediaDto } from '@proxy/medias';

@Component({
  selector: 'app-create-media',
  standalone: true, // Ensure it's standalone if it was intended to be
  imports: [CommonModule, FormsModule],
  templateUrl: './create-media.component.html',
  styleUrl: './create-media.component.scss'
})
export class CreateMediaComponent {
  media: CreateUpdateMediaDto = {
    title: '',
    description: '',
    video: '', // This will be handled by the upload component later
    metaData: '',
    projectId: '', // You might want to pre-fill this or select from a list
    sourceLanguage: '',
    destinationLanguage: '',
    countryDialect: ''
  };

  constructor(private mediasService: MediaService, private router: Router) {}

  submit() {
    this.mediasService.create(this.media).subscribe(() => {
      this.router.navigate(['/media']); // Navigate back to media list
    });
  }
}
