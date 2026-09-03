import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { CardApiService } from 'src/app/entities/cards/cards-api.service';
import { CardShareApiService } from './services/card-share-api.service';
import { SharedCardsComponent } from './shared-cards.component';

describe('SharedCardsComponent', () => {
  let component: SharedCardsComponent;
  let fixture: ComponentFixture<SharedCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedCardsComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: CardShareApiService,
          useValue: {
            getSharedCards: () => of({ you_share: [], shared_with_you: [] }),
            getAvailableUsers: () => of([]),
            getCardsSharedWithMe: () => of([]),
            shareCard: () => of({ card: {}, shared_with_users: [] }),
            updateCardShare: () => of({ card: {}, shared_with_users: [] }),
            shareAllCards: () => of({ detail: 'OK' }),
            deleteCardShare: () => of({ detail: 'OK' }),
            deleteCardSharedWithMe: () => of({ detail: 'OK' }),
          },
        },
        {
          provide: CardApiService,
          useValue: {
            list: () => of([]),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(SharedCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});
