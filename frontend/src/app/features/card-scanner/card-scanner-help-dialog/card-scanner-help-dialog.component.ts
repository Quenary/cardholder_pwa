import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-card-scanner-help-dialog',
  imports: [MatDialogModule, MatButton, TranslateModule, MatListModule],
  templateUrl: './card-scanner-help-dialog.component.html',
  styleUrl: './card-scanner-help-dialog.component.scss',
})
export class CardScannerHelpDialogComponent {
  private readonly matDialogRef = inject(MatDialogRef);

  public close(): void {
    this.matDialogRef.close();
  }
}
