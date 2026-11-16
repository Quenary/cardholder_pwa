import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ImportCardsDialogComponent,
  IImportCardsDialogData,
} from './import-cards-dialog.component';

describe('ImportCardsDialogComponent', () => {
  let component: ImportCardsDialogComponent;
  let fixture: ComponentFixture<ImportCardsDialogComponent>;
  const mockDialogRef = {
    close: vi.fn(),
  };

  const mockData: IImportCardsDialogData = {
    cards: [
      {
        name: 'Test Card',
        code: '123456',
        code_type: 'code128',
        description: 'Test note',
        color: '#ff0000',
        is_favorite: true,
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportCardsDialogComponent],
      providers: [
        provideTranslateService(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportCardsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and display cards count', () => {
    expect(component).toBeTruthy();
  });

  it('should close with false when cancel is called', () => {
    component.cancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should close with true when confirm is called', () => {
    component.confirm();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});
