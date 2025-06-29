import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardCodeViewerComponent } from './card-code-viewer.component';
import { createMatDialogMock } from 'src/app/test';
import { MatDialog } from '@angular/material/dialog';

describe('CardCodeViewerComponent', () => {
  let fixture: ComponentFixture<CardCodeViewerComponent>;
  let component: CardCodeViewerComponent;

  let matDialogMock: ReturnType<typeof createMatDialogMock>;

  beforeEach(async () => {
    matDialogMock = createMatDialogMock();

    await TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: matDialogMock }],
      imports: [CardCodeViewerComponent],
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(CardCodeViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should draw code', () => {
    fixture = TestBed.createComponent(CardCodeViewerComponent);
    component = fixture.componentInstance;
    component.card = {
      code: '0123456789012',
      code_type: 'ean13',
    };
    const canvasElement: HTMLCanvasElement =
      fixture.nativeElement.querySelector('.canvas');
    spyOn(console, 'error');
    fixture.detectChanges();

    expect(canvasElement).toBeTruthy();
    expect(console.error).toHaveBeenCalledTimes(0);
  });

  it('should not draw code', () => {
    fixture = TestBed.createComponent(CardCodeViewerComponent);
    component = fixture.componentInstance;
    component.card = {
      code: 'badvalue',
      code_type: 'ean13',
    };
    const canvasElement: HTMLCanvasElement =
      fixture.nativeElement.querySelector('.canvas');
    spyOn(console, 'error');
    fixture.detectChanges();

    expect(canvasElement).toBeTruthy();
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('should open dialog', () => {
    fixture = TestBed.createComponent(CardCodeViewerComponent);
    component = fixture.componentInstance;
    component.card = {
      code: '0123456789012',
      code_type: 'ean13',
    };
    const canvasElement: HTMLCanvasElement =
      fixture.nativeElement.querySelector('.canvas');
    fixture.detectChanges();

    expect(canvasElement).toBeTruthy();
    canvasElement.click();

    expect(matDialogMock.open).toHaveBeenCalledTimes(1);
  });
});
