import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  createCardShareApiServiceMock,
  createMatDialogRefMock,
} from 'src/testing';
import { CardShareApiService } from '../services/card-share-api.service';
import { Mocked } from 'vitest';
import {
  IShareCardDialogData,
  ShareCardDialogComponent,
} from './share-card-dialog.component';

describe('ShareCardDialogComponent', () => {
  let component: ShareCardDialogComponent;
  let fixture: ComponentFixture<ShareCardDialogComponent>;
  let matDialogRefMock: ReturnType<typeof createMatDialogRefMock>;
  let cardShareApiMock: Mocked<CardShareApiService>;

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
    cardShareApiMock = createCardShareApiServiceMock({
      getAvailableUsers: vi.fn((limit: number, offset: number) =>
        of({
          items: mockUsers.slice(offset, offset + limit),
          total: mockUsers.length,
          limit,
          offset,
        }),
      ),
    });

    await TestBed.configureTestingModule({
      imports: [ShareCardDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: matDialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'ADD_SINGLE' } },
        provideTranslateService(),
        {
          provide: CardShareApiService,
          useValue: cardShareApiMock,
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

    it('starts with an empty invalid form', () => {
      expect(component).toBeTruthy();
      expect(component['form'].valid).toBe(false);
      expect(
        component['form'].controls.cardId.errors?.['required'],
      ).toBeTruthy();
      expect(
        component['form'].controls.userIds.errors?.['required'],
      ).toBeTruthy();
    });

    describe('submit', () => {
      it('does not close when invalid', () => {
        component['submit']();
        expect(matDialogRefMock.close).not.toHaveBeenCalled();
        expect(component['form'].touched).toBe(true);
      });

      it('closes with cardId and userIds when valid', () => {
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

    it('prefills card and users', () => {
      expect(component['form'].value.cardId).toBe(42);
      expect(component['form'].value.userIds).toEqual([1]);
      expect(component['form'].valid).toBe(true);
    });

    describe('submit', () => {
      it('keeps the existing card id', () => {
        component['form'].patchValue({ userIds: [2] });
        component['submit']();

        expect(matDialogRefMock.close).toHaveBeenCalledWith({
          cardId: 42,
          userIds: [2],
        });
      });
    });
  });

  describe('SHARE_ALL mode', () => {
    beforeEach(() => {
      createComponent({
        mode: 'SHARE_ALL',
      });
    });

    it('requires only userIds', () => {
      expect(component['form'].controls.cardId.errors).toBeNull();
      expect(
        component['form'].controls.userIds.errors?.['required'],
      ).toBeTruthy();
    });

    describe('submit', () => {
      it('closes without cardId', () => {
        component['form'].patchValue({ userIds: [1, 2] });
        component['submit']();

        expect(matDialogRefMock.close).toHaveBeenCalledWith({
          cardId: undefined,
          userIds: [1, 2],
        });
      });
    });
  });

  describe('cancel', () => {
    it('closes without payload', () => {
      createComponent({ mode: 'SHARE_ALL' });
      component['cancel']();
      expect(matDialogRefMock.close).toHaveBeenCalledWith();
    });
  });

  describe('availableUsers', () => {
    it('loads from the service', async () => {
      createComponent({ mode: 'ADD_SINGLE' });
      await fixture.whenStable();
      expect(component['availableUsers']()).toEqual(mockUsers);
    });
  });

  describe('user paging', () => {
    it('walks every page', async () => {
      const many = Array.from({ length: 120 }, (_, i) => ({
        id: i + 1,
        username: `user${i + 1}`,
      }));
      const calls: number[] = [];

      await TestBed.configureTestingModule({
        imports: [ShareCardDialogComponent],
        providers: [
          { provide: MatDialogRef, useValue: createMatDialogRefMock() },
          { provide: MAT_DIALOG_DATA, useValue: { mode: 'ADD_SINGLE' } },
          provideTranslateService(),
          {
            provide: CardShareApiService,
            useValue: createCardShareApiServiceMock({
              getAvailableUsers: vi.fn((limit: number, offset: number) => {
                calls.push(offset);
                return of({
                  items: many.slice(offset, offset + limit),
                  total: many.length,
                  limit,
                  offset,
                });
              }),
            }),
          },
        ],
      }).compileComponents();

      const pagingFixture = TestBed.createComponent(ShareCardDialogComponent);
      pagingFixture.detectChanges();
      await pagingFixture.whenStable();

      expect(calls).toEqual([0, 50, 100]);
    });
  });
});
