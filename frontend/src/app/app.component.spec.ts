import {
  ComponentFixture,
  TestBed,
  DeferBlockState,
} from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { provideRouter } from '@angular/router';
import { TestTranslateModule, ITestAppState, testAppState } from './test';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  let storeMock: MockStore;
  let initialState: ITestAppState;

  beforeEach(async () => {
    initialState = { ...testAppState };

    await TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState }), provideRouter([])],
      imports: [AppComponent, TestTranslateModule],
    }).compileComponents();

    storeMock = TestBed.inject(MockStore);
  });

  it('should create the app', () => {
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render unauthorized content', async () => {
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
    expect(component.isAuthorized()).toBeFalsy();
    const deferBlocks = await fixture.getDeferBlocks();
    expect(deferBlocks.length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelector('.sidenav-container-content-outlet'),
    ).toBeTruthy();
  });

  it('should render authorized content (menu)', async () => {
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
