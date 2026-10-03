import {
  ComponentFixture,
  TestBed,
  DeferBlockState,
} from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import {
  createCardShareApiServiceMock,
  ITestAppState,
  testAppState,
} from 'src/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { CardShareApiService } from './features/shared-cards/services/card-share-api.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

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
          useValue: createCardShareApiServiceMock(),
        },
      ],
      imports: [AppComponent],
    }).compileComponents();

    storeMock = TestBed.inject(MockStore);
  });

  it('should create', () => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('shell', () => {
    it('shows outlet when logged out', async () => {
      storeMock.setState({
        ...initialState,
        auth: {
          init: true,
        },
      });
      fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;
      fixture.autoDetectChanges();
      await fixture.whenStable();
      expect(component['isAuthorized']()).toBeFalsy();
      const deferBlocks = await fixture.getDeferBlocks();
      expect(deferBlocks.length).toBe(0);
      const compiled = fixture.nativeElement as HTMLElement;
      expect(
        compiled.querySelector('.sidenav-container-content-outlet'),
      ).toBeTruthy();
    });

    it('shows toolbar when logged in', async () => {
      fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;
      fixture.autoDetectChanges();
      await fixture.whenStable();
      const deferBlocks = await fixture.getDeferBlocks();
      expect(deferBlocks.length).toBe(1);
      await deferBlocks[0].render(DeferBlockState.Complete);
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.mat-toolbar')).toBeTruthy();
    });
  });
});
