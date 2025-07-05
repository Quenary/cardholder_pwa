import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Filter, Sorting } from 'src/app/shared/types';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTimepickerModule } from '@angular/material/timepicker';

/**
 * Data for {@link SortFilterDialogComponent}
 */
export interface ISortFilterDialogData<T> {
  /**
   * Title of the dialog.
   * @default 'SORT_FILTER.TITLE'
   */
  title?: string;
  sorting?: {
    options: Sorting.Option<T>[];
    value: Sorting.Model<T, keyof T>;
  };
  filter?: {
    options: Filter.Option<T, keyof T>[];
    value: Filter.Model<T, keyof T>[];
  };
}
/**
 * Result of {@link SortFilterDialogComponent}
 */
export interface ISortFilterDialogResult<T> {
  sortingModel?: Sorting.Model<T, keyof T>;
  filterModels?: Filter.Model<T, keyof T>[];
}
/**
 * Yupe of filter form
 */
type TFilterFormArrayItem<T extends unknown, K extends keyof T> = FormGroup<{
  option: FormControl<Filter.Option<T, K>>;
  criteria: FormControl<Filter.Criteria>;
  value: FormControl<T[K]>;
}>;

@Component({
  selector: 'app-sort-filter-dialog',
  imports: [
    MatDialogModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatDatepickerModule,
    TranslateModule,
    MatSelectModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatIcon,
    MatButton,
    MatTimepickerModule,
  ],
  templateUrl: './sort-filter-dialog.component.html',
  styleUrl: './sort-filter-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SortFilterDialogComponent<T> {
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly data: ISortFilterDialogData<T> = inject(MAT_DIALOG_DATA);
  private readonly translateService = inject(TranslateService);
  /**
   * Maximum number of filters
   * @default 10
   */
  public readonly maxFilters = input<number>(10);
  /**
   * Title of the dialog
   */
  public readonly title = this.data?.title ?? 'SORT_FILTER.TITLE';
  /**
   * Sorting options
   */
  public readonly sortingOptions = this.data?.sorting?.options;
  /**
   * Sorting orders
   */
  public readonly sortingOrders: {
    value: Sorting.Direction;
    label: string;
    icon: string;
  }[] = [
    { value: 'asc', label: 'SORT_FILTER.SORT_DIRS.ASC', icon: 'arrow_upwards' },
    {
      value: 'desc',
      label: 'SORT_FILTER.SORT_DIRS.DESC',
      icon: 'arrow_downwards',
    },
  ];
  /**
   * Sorting form
   */
  public readonly sortingForm = new FormGroup({
    key: new FormControl<keyof T>(this.data?.sorting?.value?.key ?? null, [
      Validators.required,
    ]),
    direction: new FormControl<Sorting.Direction>(
      this.data?.sorting?.value?.direction ?? null,
      [Validators.required],
    ),
  });

  /**
   * Options for select of boolean typed filter
   */
  public readonly booleanOption: { value: boolean; label: string }[] = (() => {
    const labels = this.translateService.instant('SORT_FILTER.BOOL_LABEL');
    return [
      { value: true, label: labels.TRUE },
      { value: false, label: labels.FALSE },
    ];
  })();
  /**
   * Enum of filter criterias
   */
  public readonly FilterCriteria = Filter.Criteria;
  /**
   * Filter options
   */
  public readonly filterOptions = this.data?.filter?.options;
  /**
   * Names of the criterias
   */
  public readonly criteriasNames = this.translateService.instant(
    'SORT_FILTER.CRITERIAS',
  );
  /**
   * Array of filter forms
   */
  public readonly filterFormArray = new FormArray<
    TFilterFormArrayItem<T, keyof T>
  >([]);

  constructor() {
    if (this.data?.filter?.value?.length) {
      for (const item of this.data.filter.value) {
        const form = this.getFilterFormArrayItem(item);
        this.filterFormArray.push(form);
      }
    }
  }

  private getFilterFormArrayItem(
    value?: Filter.Model<T, keyof T>,
  ): TFilterFormArrayItem<T, keyof T> {
    const option = value
      ? this.filterOptions.find((o) => o.key == value.key)
      : null;
    const form: TFilterFormArrayItem<T, keyof T> = new FormGroup({
      option: new FormControl(option, [Validators.required]),
      criteria: new FormControl(value?.criteria, [Validators.required]),
      value: new FormControl(value?.value),
    });
    return form;
  }

  public addFilter(): void {
    this.filterFormArray.push(this.getFilterFormArrayItem());
  }

  public removeFilter(form: TFilterFormArrayItem<T, keyof T>): void {
    const index = this.filterFormArray.controls.findIndex((f) => f === form);
    this.filterFormArray.controls.splice(index, 1);
  }

  public confirm(): void {
    const data: ISortFilterDialogResult<T> = {};
    if (this.sortingForm.valid) {
      data.sortingModel = this.sortingForm.getRawValue();
    }
    const filterModels: Filter.Model<T, keyof T>[] = [];
    for (const f of this.filterFormArray.controls) {
      if (f.valid) {
        const _value = f.controls.value.value as any;
        let value = null;
        if (_value) {
          switch (f.controls.option.value.type) {
            case 'number':
              value = Number(_value);
              break;
            case 'bigint':
              value = BigInt(_value);
              break;
            default:
              value = _value;
          }
        }
        filterModels.push({
          key: f.controls.option.value.key,
          criteria: f.controls.criteria.value,
          value: value,
        });
      }
    }
    if (filterModels.length) {
      data.filterModels = filterModels;
    }
    this.matDialogRef.close(data);
  }

  public cancel(): void {
    this.matDialogRef.close();
  }
}
