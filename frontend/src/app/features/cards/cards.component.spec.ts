import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardsComponent } from './cards.component';
import { ITestAppState, testAppState } from 'src/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ICard } from 'src/app/entities/cards/cards-interface';
import { provideTranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CardsActions } from 'src/app/entities/cards/state/cards.actions';
import { CardCodeViewerDialogComponent } from 'src/app/shared/components/card-code-viewer/card-code-viewer.component';
import {
  createCardShareApiServiceMock,
  createCardApiServiceMock,
  createSnackServiceMock,
} from 'src/testing';
import { CardShareApiService } from '../shared-cards/services/card-share-api.service';
import { CardApiService } from 'src/app/entities/cards/cards-api.service';
import { SnackService } from 'src/app/core/services/snack.service';
import { ELocalStorageKey } from 'src/app/app.consts';
import { of } from 'rxjs';
import { ImportCardsDialogComponent } from './import-cards-dialog/import-cards-dialog.component';

describe('CardsComponent', () => {
  let component: CardsComponent;
  let fixture: ComponentFixture<CardsComponent>;

  let storeMock: MockStore;
  let initialState: ITestAppState;

  let cardApiServiceMock: ReturnType<typeof createCardApiServiceMock>;
  let snackServiceMock: ReturnType<typeof createSnackServiceMock>;

  beforeEach(async () => {
    initialState = { ...testAppState };
    cardApiServiceMock = createCardApiServiceMock();
    snackServiceMock = createSnackServiceMock();

    await TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        provideRouter([]),
        provideTranslateService(),
        {
          provide: CardShareApiService,
          useValue: createCardShareApiServiceMock(),
        },
        {
          provide: CardApiService,
          useValue: cardApiServiceMock,
        },
        {
          provide: SnackService,
          useValue: snackServiceMock,
        },
      ],
      imports: [CardsComponent],
    }).compileComponents();

    storeMock = TestBed.inject(MockStore);
  });

  it('should create', () => {
    fixture = TestBed.createComponent(CardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('layout', () => {
    beforeEach(() => localStorage.removeItem(ELocalStorageKey.CARD_LAYOUT));

    it('defaults to the grid', () => {
      fixture = TestBed.createComponent(CardsComponent);
      expect(fixture.componentInstance['layout']()).toBe('grid');
    });

    it('switches to large cards and remembers it', () => {
      fixture = TestBed.createComponent(CardsComponent);
      fixture.componentInstance['toggleLayout']();
      expect(fixture.componentInstance['layout']()).toBe('large');
      expect(localStorage.getItemJson(ELocalStorageKey.CARD_LAYOUT)).toBe(
        'large',
      );
    });

    it('starts from the remembered layout', () => {
      localStorage.setItemJson(ELocalStorageKey.CARD_LAYOUT, 'large');
      fixture = TestBed.createComponent(CardsComponent);
      expect(fixture.componentInstance['layout']()).toBe('large');
    });
  });

  describe('cards computed', () => {
    it('filters by search text', () => {
      const list: ICard[] = [
        {
          code: 'https://github.com/Quenary/cardholder_pwa',
          code_type: 'qrcode',
          name: 'Repo',
          description: null,
          color: '#d40c0c',
          id: 1,
          updated_at: null,
          created_at: null,
        },
        {
          code: '0123456789012',
          code_type: 'ean13',
          name: 'test',
          description: 'test desc\nnewline',
          color: '#057eff',
          id: 2,
          updated_at: null,
          created_at: null,
        },
      ];
      storeMock.setState({
        cards: {
          list,
        },
      });
      fixture = TestBed.createComponent(CardsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      component['searchControl'].setValue('tes');
      expect(component['cards']()).toEqual([list[1]]);
      component['searchControl'].setValue('rep');
      expect(component['cards']()).toEqual([list[0]]);
      component['searchControl'].setValue('qwerty');
      expect(component['cards']()).toEqual([]);
    });
  });

  describe('showCode', () => {
    it('opens the viewer instead of the card screen', () => {
      const card: ICard = {
        id: 7,
        name: 'shop',
        code: '12345678',
        code_type: 'ean8',
        description: null,
        color: null,
        used_at: null,
        updated_at: null,
        created_at: null,
        has_logo: true,
      };
      fixture = TestBed.createComponent(CardsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const matDialog = TestBed.inject(MatDialog);
      const openSpy = vi.spyOn(matDialog, 'open').mockReturnValue({} as never);
      const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');
      const dispatchSpy = vi.spyOn(storeMock, 'dispatch');

      component['showCode'](card);

      expect(openSpy).toHaveBeenCalledWith(
        CardCodeViewerDialogComponent,
        expect.objectContaining({ data: expect.objectContaining({ card }) }),
      );
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: CardsActions.patchListItem.type }),
      );
    });
  });

  describe('onFileSelected', () => {
    it('shows error if no valid cards in CSV', () => {
      fixture = TestBed.createComponent(CardsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const blob = new Blob(['invalid csv content'], { type: 'text/csv' });
      const file = new File([blob], 'empty.csv', { type: 'text/csv' });
      const event = {
        target: {
          files: [file],
          value: 'C:\\fakepath\\empty.csv',
        },
      } as unknown as Event;

      component['onFileSelected'](event);

      // Wait for FileReader
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(snackServiceMock.error).toHaveBeenCalled();
          resolve();
        }, 50);
      });
    });

    it('opens import dialog and bulk creates cards on confirm', () => {
      fixture = TestBed.createComponent(CardsComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const matDialog = TestBed.inject(MatDialog);
      const dialogRefMock = {
        afterClosed: vi.fn().mockReturnValue(of(true)),
      };
      const openSpy = vi
        .spyOn(matDialog, 'open')
        .mockReturnValue(dialogRefMock as never);
      const dispatchSpy = vi.spyOn(storeMock, 'dispatch');

      const csvContent = `_id,store,note,validfrom,expiry,balance,balancetype,cardid,barcodeid,barcodetype,barcodeencoding,headercolor,starstatus,lastused,archive
20,Test Store,,,,0,,12345678,,CODE_128,ISO-8859-1,-957596,1,1792296418,0`;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], 'test.csv', { type: 'text/csv' });
      const event = {
        target: {
          files: [file],
          value: 'test.csv',
        },
      } as unknown as Event;

      component['onFileSelected'](event);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(openSpy).toHaveBeenCalledWith(
            ImportCardsDialogComponent,
            expect.objectContaining({
              data: expect.objectContaining({
                cards: expect.arrayContaining([
                  expect.objectContaining({
                    name: 'Test Store',
                    code: '12345678',
                    code_type: 'code128',
                  }),
                ]),
              }),
            }),
          );
          expect(cardApiServiceMock.bulkCreate).toHaveBeenCalled();
          expect(snackServiceMock.success).toHaveBeenCalled();
          expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: CardsActions.list.type }),
          );
          resolve();
        }, 50);
      });
    });
  });
});
