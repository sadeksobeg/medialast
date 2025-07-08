import { Component, OnInit } from '@angular/core';
import { PagedAndSortedResultRequestDto } from '@abp/ng.core';
import { MediaDto, MediaService } from '@proxy/medias';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Import RouterModule
import Swal from 'sweetalert2'; // Import Swal

@Component({
  selector: 'app-list-medias',
  imports: [CommonModule, RouterModule], // Add RouterModule here
  templateUrl: './list-medias.component.html',
  styleUrls: ['./list-medias.component.scss']
})
export class ListMediasComponent implements OnInit {
  media: MediaDto[] = [];
  input: PagedAndSortedResultRequestDto = {
    maxResultCount: 10,
    skipCount: 0,
    sorting: ''
  };

  constructor(private mediasService: MediaService) {}

  ngOnInit(): void {
    this.loadMedia();
  }

  loadMedia(): void {
    this.mediasService.getList(this.input).subscribe({
      next: response => {
        console.log('Media List API Response:', response);
        if (response && response.items) {
          this.media = response.items;
        } else {
          console.log('No items in the media list response');
        }
      },
      error: error => {
        console.error('Error fetching media list:', error);
        // You might want to display an alert or a user-friendly message here
      }
    });
  }

  loadMore(): void {
    this.input.skipCount += this.input.maxResultCount;
    this.mediasService.getList(this.input).subscribe({
      next: response => {
        console.log('Load More Media API Response:', response);
        this.media = [...this.media, ...response.items];
      },
      error: error => {
        console.error('Error loading more media:', error);
        // You might want to display an alert or a user-friendly message here
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
    // Create a modal or navigate to a detailed view
    const details = `
      Title: ${media.title}
      Description: ${media.description || 'No description'}
      Source Language: ${media.sourceLanguage || 'Not specified'}
      Destination Language: ${media.destinationLanguage || 'Not specified'}
      Country Dialect: ${media.countryDialect || 'Not specified'}
    `;
    
    Swal.fire({
      title: 'Media Details',
      html: `<pre style="text-align: left; white-space: pre-wrap;">${details}</pre>`,
      icon: 'info',
      confirmButtonText: 'Close',
      width: '500px'
    });
  }
}
