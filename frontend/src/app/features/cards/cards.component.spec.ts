import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardsComponent } from './cards.component';
import { ITestAppState, testAppState, TestTranslateModule } from 'src/app/test';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { ICard } from 'src/app/entities/cards/cards-interface';

describe('CardsComponent', () => {
  let component: CardsComponent;
  let fixture: ComponentFixture<CardsComponent>;

  let storeMock: MockStore;
  let initialState: ITestAppState;

  beforeEach(async () => {
    initialState = { ...testAppState };

    await TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState }), provideRouter([])],
      imports: [CardsComponent, TestTranslateModule],
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
      },
      {
        'code': '0123456789012',
        'code_type': 'ean13',
        'name': 'test',
        'description': 'test desc\nnewline',
        'color': '#057eff',
        'id': 2,
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
    component.searchControl.setValue('tes');
    expect(component.cards()).toEqual([list[1]]);
    component.searchControl.setValue('rep');
    expect(component.cards()).toEqual([list[0]]);
    component.searchControl.setValue('qwerty');
    expect(component.cards()).toEqual([]);
  });
});
