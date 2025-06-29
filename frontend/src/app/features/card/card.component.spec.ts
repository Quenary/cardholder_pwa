import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';
import { provideRouter } from '@angular/router';
import { ITestAppState, testAppState, TestTranslateModule } from 'src/app/test';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { CardsActions } from 'src/app/entities/cards/state/cards.actions';

describe('CardComponent', () => {
  let fixture: ComponentFixture<CardComponent>;
  let component: CardComponent;

  let storeMock: MockStore;
  let initialState: ITestAppState;

  beforeEach(async () => {
    initialState = { ...testAppState };

    await TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState }), provideRouter([])],
      imports: [CardComponent, TestTranslateModule],
    }).compileComponents();

    storeMock = TestBed.inject(MockStore);
  });

  it('should create', () => {
    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should save valid card', () => {
    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    const dispatchSpy = spyOn(storeMock, 'dispatch');
    fixture.detectChanges();

    component.form.patchValue({
      code: '12345678',
      code_type: 'ean8',
      name: 'newcard',
    });
    component.onSubmit();

    expect(dispatchSpy).toHaveBeenCalledWith(CardsActions.saveCard());
  });

  it('should not save invalid card', () => {
    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    const dispatchSpy = spyOn(storeMock, 'dispatch');
    fixture.detectChanges();

    component.form.patchValue({
      code: '12345678',
      code_type: null,
      name: 'newcard',
    });
    component.onSubmit();

    component.form.patchValue({
      code: null,
      code_type: 'ean8',
      name: 'newcard',
    });
    component.onSubmit();

    component.form.patchValue({
      code: '12345678',
      code_type: 'ean8',
      name: null,
    });
    component.onSubmit();

    expect(
      dispatchSpy.calls
        .all()
        .some(
          (call) => (call.args[0] as any).type == CardsActions.saveCard.type,
        ),
    ).toBeFalse();
  });
});
