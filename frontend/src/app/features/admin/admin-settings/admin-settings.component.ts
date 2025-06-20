import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatInput } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, finalize } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { AdminApiService } from 'src/app/entities/admin/admin-api.service';
import {
  ESettingValueType,
  ISetting,
} from 'src/app/entities/admin/admin-interface';

@Component({
  selector: 'app-admin-settings',
  imports: [
    MatCheckbox,
    MatInput,
    MatTableModule,
    AsyncPipe,
    TranslateModule,
    DatePipe,
  ],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss',
})
export class AdminSettingsComponent implements OnInit {
  private readonly adminApiService = inject(AdminApiService);
  private readonly snackService = inject(SnackService);

  public readonly ESettingValueType = ESettingValueType;
  public readonly displayedColumns: (keyof ISetting)[] = [
    'key',
    'value',
    'updated_at',
  ];
  public readonly isLoading$ = new BehaviorSubject<boolean>(false);
  public readonly settings$ = new BehaviorSubject<ISetting[]>([]);

  ngOnInit(): void {
    this.getSettings();
  }

  private getSettings(): void {
    this.isLoading$.next(true);
    this.adminApiService
      .getSettings()
      .pipe(
        finalize(() => {
          this.isLoading$.next(false);
        })
      )
      .subscribe({
        next: (list) => {
          this.settings$.next(list);
        },
        error: (error) => {
          this.snackService.error(error);
        },
      });
  }

  public onChange(value: number | boolean | string, setting: ISetting): void {
    switch (setting.value_type) {
      case ESettingValueType.FLOAT:
        value = Number(value);
        break;
      case ESettingValueType.INT:
        value = +Number(value).toFixed(0);
        break;
      case ESettingValueType.BOOL:
        value = Boolean(value);
        break;
      default:
        value = value;
    }

    this.isLoading$.next(true);
    this.adminApiService
      .setSettings([
        {
          key: setting.key,
          value,
        },
      ])
      .pipe(
        finalize(() => {
          this.isLoading$.next(false);
        })
      )
      .subscribe({
        next: () => {
          this.getSettings();
        },
        error: (error) => {
          this.snackService.error(error);
        },
      });
  }
}
