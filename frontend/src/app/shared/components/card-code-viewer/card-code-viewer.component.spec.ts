import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CardCodeViewerComponent,
  CardCodeViewerDialogComponent,
  ICardCodeViewerData,
} from './card-code-viewer.component';
import { createMatDialogMock, createMatDialogRefMock } from 'src/testing';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { ELocalStorageKey } from 'src/app/app.consts';
import { provideTranslateService } from '@ngx-translate/core';

describe('CardCodeViewerComponent', () => {
  let fixture: ComponentFixture<CardCodeViewerComponent>;
  let component: CardCodeViewerComponent;

  let matDialogMock: ReturnType<typeof createMatDialogMock>;

  beforeEach(async () => {
    matDialogMock = createMatDialogMock();

    vi.spyOn(console, 'error').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      providers: [{ provide: MatDialog, useValue: matDialogMock }],
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

describe('CardCodeViewerDialogComponent', () => {
  let fixture: ComponentFixture<CardCodeViewerDialogComponent>;
  let component: CardCodeViewerDialogComponent;

  let matDialogRefMock: ReturnType<typeof createMatDialogRefMock>;
  let matDialogDataMock: ICardCodeViewerData;

  beforeEach(async () => {
    matDialogRefMock = createMatDialogRefMock();
    matDialogDataMock = {
      card: {
        code: '0123456789012',
        code_type: 'ean13',
      },
      scale: 3,
      color: '#000000',
    };

    await TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        { provide: MatDialogRef, useValue: matDialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: matDialogDataMock },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(CardCodeViewerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should preserve color inversion in local storage', () => {
    const lsGetSpy = vi
      .spyOn(Storage.prototype, 'getItemJson')
      .mockReturnValue(true);
    const lsSetSpy = vi.spyOn(Storage.prototype, 'setItemJson');
    fixture = TestBed.createComponent(CardCodeViewerDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(lsGetSpy).toHaveBeenCalledTimes(1);
    expect(component.invert()).toBe(true);

    component.toggleInvert();

    expect(lsSetSpy).toHaveBeenCalledTimes(1);
    expect(lsSetSpy).toHaveBeenCalledWith(
      ELocalStorageKey.CODE_COLOR_INVERSION,
      false,
    );
    expect(component.invert()).toBe(false);
  });
});
