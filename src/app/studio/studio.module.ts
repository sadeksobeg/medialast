import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop'; // Import DragDropModule
import { RouterModule } from '@angular/router'; // Import RouterModule
import { MediaService } from '../proxy/medias/media.service'; // Import MediaService

import { StudioRoutingModule } from './studio-routing.module';
import { StudioComponent } from './studio.component';
import { MediaBinComponent } from './media-bin/media-bin.component';
import { StudioActionButtonComponent } from './studio-action-button/studio-action-button.component';


@NgModule({
  declarations: [
    StudioComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    StudioRoutingModule,
    StudioActionButtonComponent,
    DragDropModule,
    MediaBinComponent // Move MediaBinComponent here
  ],
  providers: [
    MediaService
  ],
  exports: [
    StudioComponent
  ]
})
export class StudioModule { }
