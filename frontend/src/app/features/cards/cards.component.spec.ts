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
import { CardShareApiService } from '../shared-cards/services/card-share-api.service';
import { of } from 'rxjs';

describe('CardsComponent', () => {
  let component: CardsComponent;
  let fixture: ComponentFixture<CardsComponent>;

  let storeMock: MockStore;
  let initialState: ITestAppState;

  beforeEach(async () => {
    initialState = { ...testAppState };

    await TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        provideRouter([]),
        provideTranslateService(),
        {
          provide: CardShareApiService,
          useValue: {
            getCardsSharedWithMe: () => of([]),
          },
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

  it('should search cards by name', () => {
    const list: ICard[] = [
      {
        'code': 'https://github.com/Quenary/cardholder_pwa',
        'code_type': 'qrcode',
        'name': 'Repo',
        'description': null,
        'color': '#d40c0c',
        'id': 1,
        'updated_at': null,
        'created_at': null,
      },
      {
        'code': '0123456789012',
        'code_type': 'ean13',
        'name': 'test',
        'description': 'test desc\nnewline',
        'color': '#057eff',
        'id': 2,
        'updated_at': null,
        'created_at': null,
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
  it('should show the code full size rather than open the card screen', () => {
    // A card showing a logo has no code preview to tap, so the logo takes that
    // role. Navigating to the edit screen instead would put the code two taps
    // away, which is the wrong thing at a till.
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
