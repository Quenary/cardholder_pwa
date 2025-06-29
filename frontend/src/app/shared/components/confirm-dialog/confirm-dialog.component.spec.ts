import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ConfirmDialogComponent,
  IConfirmDialogData,
} from './confirm-dialog.component';
import { createMatDialogRefMock, TestTranslateModule } from 'src/app/test';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatCheckbox } from '@angular/material/checkbox';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  let matDialogRefMock: ReturnType<typeof createMatDialogRefMock>;

  beforeEach(async () => {
    matDialogRefMock = createMatDialogRefMock();

    await TestBed.configureTestingModule({
      providers: [
        { provide: MatDialogRef, useValue: matDialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
      imports: [ConfirmDialogComponent, TestTranslateModule, MatCheckbox],
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display provided text content', () => {
    const useValue: IConfirmDialogData = {
      title: 'testtitle',
      subtitle: 'testsubtitle',
      cancelText: 'canceltext',
      confirmText: 'confirmtext',
    };
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue });
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const template = fixture.nativeElement as HTMLElement;
    expect(template.querySelector('h2').textContent).toEqual(useValue.title);
    expect(
      template.querySelector('mat-dialog-content>span').textContent,
    ).toEqual(useValue.subtitle);
    expect(
      template
        .querySelector('mat-dialog-actions>button:first-child')
        .textContent.trim(),
    ).toEqual(useValue.cancelText);
    expect(
      template
        .querySelector('mat-dialog-actions>button:last-child')
        .textContent.trim(),
    ).toEqual(useValue.confirmText);
  });

  it('should enable confirm button with checkbox', () => {
    const useValue: IConfirmDialogData = {
      addCheckbox: true,
      title: 'testtitle',
      subtitle: 'testsubtitle',
      cancelText: 'canceltext',
      confirmText: 'confirmtext',
    };
    TestBed.overrideProvider(MAT_DIALOG_DATA, { useValue });
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const template = fixture.nativeElement as HTMLElement;
    const checkbox = template.querySelector('mat-dialog-content>mat-checkbox');
    expect(checkbox).toBeTruthy();
    expect(
      template.querySelector('mat-dialog-actions>button:last-child:disabled'),
    ).toBeTruthy();
    component.confirmCheckbox.set(true);
    fixture.detectChanges();
    expect(
      template.querySelector('mat-dialog-actions>button:last-child:disabled'),
    ).toBeFalsy();
  });
});
