import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { createMatDialogRefMock } from 'src/testing';
import { CardShareApiService } from '../services/card-share-api.service';
import {
  IShareCardDialogData,
  ShareCardDialogComponent,
} from './share-card-dialog.component';

describe('ShareCardDialogComponent', () => {
  let component: ShareCardDialogComponent;
  let fixture: ComponentFixture<ShareCardDialogComponent>;
  let matDialogRefMock: ReturnType<typeof createMatDialogRefMock>;

  const mockUsers = [
    { id: 1, username: 'alice' },
    { id: 2, username: 'bob' },
  ];

  const createComponent = (data: IShareCardDialogData) => {
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue: data });
    fixture = TestBed.createComponent(ShareCardDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    matDialogRefMock = createMatDialogRefMock();

    await TestBed.configureTestingModule({
      imports: [ShareCardDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: matDialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'ADD_SINGLE' } },
        provideTranslateService(),
        {
          provide: CardShareApiService,
          useValue: {
            getAvailableUsers: () => of(mockUsers),
          },
        },
      ],
    }).compileComponents();
  });

  describe('ADD_SINGLE mode', () => {
    beforeEach(() => {
      createComponent({
        mode: 'ADD_SINGLE',
        availableCards: [
          {
            id: 10,
            name: 'Card 1',
            color: '#ff0000',
            code: '123',
            code_type: 'qr',
            description: null,
            created_at: null,
            updated_at: null,
          },
        ],
      });
    });

    it('should create and initialize empty invalid form', () => {
      expect(component).toBeTruthy();
      expect(component['form'].valid).toBe(false);
      expect(
        component['form'].controls.cardId.errors?.['required'],
      ).toBeTruthy();
      expect(
        component['form'].controls.userIds.errors?.['required'],
      ).toBeTruthy();
    });

    it('should not close dialog if form is invalid upon submit', () => {
      component['submit']();
      expect(matDialogRefMock.close).not.toHaveBeenCalled();
      expect(component['form'].touched).toBe(true);
    });

    it('should close dialog with cardId and userIds on valid submit', () => {
      component['form'].patchValue({
        cardId: 10,
        userIds: [1, 2],
      });
      expect(component['form'].valid).toBe(true);

      component['submit']();
      expect(matDialogRefMock.close).toHaveBeenCalledWith({
        cardId: 10,
        userIds: [1, 2],
      });
    });
  });

  describe('EDIT_SINGLE mode', () => {
    beforeEach(() => {
      createComponent({
        mode: 'EDIT_SINGLE',
        card: {
          id: 42,
          name: 'Existing Card',
          color: '#00ff00',
          code: '456',
          code_type: 'ean13',
          description: null,
          created_at: null,
          updated_at: null,
        },
        sharedWithUserIds: [1],
      });
    });

    it('should initialize with provided card id and user ids', () => {
      expect(component['form'].value.cardId).toBe(42);
      expect(component['form'].value.userIds).toEqual([1]);
      expect(component['form'].valid).toBe(true);
    });

    it('should submit with existing card id even if cardId is not in form', () => {
      component['form'].patchValue({ userIds: [2] });
      component['submit']();

      expect(matDialogRefMock.close).toHaveBeenCalledWith({
        cardId: 42,
        userIds: [2],
      });
    });
  });

  describe('SHARE_ALL mode', () => {
    beforeEach(() => {
      createComponent({
        mode: 'SHARE_ALL',
      });
    });

    it('should not require cardId but require userIds', () => {
      expect(component['form'].controls.cardId.errors).toBeNull();
      expect(
        component['form'].controls.userIds.errors?.['required'],
      ).toBeTruthy();
    });

    it('should submit with userIds and undefined cardId', () => {
      component['form'].patchValue({ userIds: [1, 2] });
      component['submit']();

      expect(matDialogRefMock.close).toHaveBeenCalledWith({
        cardId: undefined,
        userIds: [1, 2],
      });
    });
  });

  describe('Cancel action', () => {
    it('should close dialog without payload on cancel', () => {
      createComponent({ mode: 'SHARE_ALL' });
      component['cancel']();
      expect(matDialogRefMock.close).toHaveBeenCalledWith();
    });
  });

  describe('Available users resource', () => {
    it('should load available users from service', async () => {
      createComponent({ mode: 'ADD_SINGLE' });
      await fixture.whenStable();
      expect(component['availableUsers']()).toEqual(mockUsers);
    });
  });
});
