import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  ISortFilterDialogData,
  SortFilterDialogComponent,
} from './sort-filter-dialog.component';
import { ICard } from 'src/app/entities/cards/cards-interface';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { createMatDialogRefMock, TestTranslateModule } from 'src/app/test';
import { Filter } from 'src/app/shared/types';

const dialogData: ISortFilterDialogData<ICard> = {
  title: 'TEST TITLE',
  sorting: {
    options: [
      { key: 'name', label: 'CARDS.CARD.NAME' },
      { key: 'used_at', label: 'CARDS.CARD.USED_AT' },
      { key: 'updated_at', label: 'CARDS.CARD.UPDATED_AT' },
      { key: 'created_at', label: 'CARDS.CARD.CREATED_AT' },
    ],
    value: {
      key: 'name',
      direction: 'asc',
    },
  },
  filter: {
    options: [
      {
        key: 'description',
        type: 'string',
        criterias: [
          Filter.Criteria.LIKE,
          Filter.Criteria.NOT_NULL,
          Filter.Criteria.NULL,
        ],
        label: 'CARDS.CARD.DESCRIPTION',
      },
      {
        key: 'is_favorite',
        type: 'boolean',
        criterias: [Filter.Criteria.EQUALS],
        label: 'CARDS.CARD.IS_FAVORITE',
      },
      {
        key: 'used_at',
        type: 'date',
        criterias: [
          Filter.Criteria.GREATER_OR_EQUALS,
          Filter.Criteria.LESS_OR_EQUALS,
          Filter.Criteria.GREATER,
          Filter.Criteria.LESS,
        ],
        label: 'CARDS.CARD.USED_AT',
      },
    ],
    value: [
      {
        key: 'description',
        criteria: Filter.Criteria.LIKE,
        value: 'test',
      },
      {
        key: 'is_favorite',
        criteria: Filter.Criteria.EQUALS,
        value: true,
      },
    ],
  },
};

fdescribe('SortFilterDialogComponent', () => {
  let component: SortFilterDialogComponent<ICard>;
  let fixture: ComponentFixture<SortFilterDialogComponent<ICard>>;
  let template: HTMLElement;

  let matDialogRefMock: ReturnType<typeof createMatDialogRefMock>;

  beforeEach(() => {
    matDialogRefMock = createMatDialogRefMock();

    TestBed.configureTestingModule({
      imports: [TestTranslateModule],
      providers: [
        { provide: MatDialogRef, useValue: matDialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SortFilterDialogComponent<ICard>);
    component = fixture.componentInstance;
    template = fixture.debugElement.nativeElement;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display forms from data', () => {
    fixture.detectChanges();

    let formsElements = template.querySelectorAll('form');
    expect(formsElements.length).toEqual(3);

    const anotherFilter: Filter.Model<ICard, keyof ICard> = {
      key: 'used_at',
      criteria: Filter.Criteria.GREATER_OR_EQUALS,
      value: '2025-07-04T21:00:00.000Z',
    };
  });

  it('should add filter', () => {
    fixture.detectChanges();

    let addFiterButton: HTMLButtonElement = template.querySelector(
      'mat-dialog-content > button',
    );
    expect(addFiterButton).toBeTruthy();

    addFiterButton.click();
    fixture.detectChanges();

    let formsElements = template.querySelectorAll('form');
    expect(formsElements.length).toEqual(4);
  });

  it('should remove filter', () => {
    fixture.detectChanges();

    const filterFormRemoveButton: HTMLElement = template.querySelector(
      'mat-dialog-content form[name="filter-form"] [name="filter-form-remove-button"]',
    );
    expect(filterFormRemoveButton).toBeTruthy();

    filterFormRemoveButton.click();
    fixture.detectChanges();

    let formsElements = template.querySelectorAll('form');
    expect(formsElements.length).toEqual(2);
  });
});
