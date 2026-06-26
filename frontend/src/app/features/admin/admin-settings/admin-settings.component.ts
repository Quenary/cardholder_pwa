import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatInput } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { AdminApiService } from 'src/app/entities/admin/admin-api.service';
import {
  ESettingValueType,
  ISetting,
} from 'src/app/entities/admin/admin-interface';
import { NaiveDatePipe } from 'src/app/shared/pipes/naive-date.pipe';
import { MatTooltip } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { AppActions } from 'src/app/state/app.actions';

@Component({
  selector: 'app-admin-settings',
  imports: [
    MatCheckbox,
    MatInput,
    MatTableModule,
    TranslatePipe,
    DatePipe,
    NaiveDatePipe,
    MatTooltip,
  ],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss',
})
export class AdminSettingsComponent implements OnInit {
  private readonly adminApiService = inject(AdminApiService);
  private readonly snackService = inject(SnackService);
  private readonly translateService = inject(TranslateService);
  private readonly store = inject(Store);

  protected readonly keysTranslations = this.translateService.instant(
    'ADMIN.SETTINGS.KEYS',
  );
  protected readonly ESettingValueType = ESettingValueType;
  protected readonly displayedColumns: (keyof ISetting)[] = [
    'key',
    'updated_at',
    'value',
  ];
  protected readonly settings = signal<ISetting[]>([]);

  ngOnInit(): void {
    this.getSettings();
  }

  private getSettings(): void {
    this.adminApiService.getSettings().subscribe({
      next: (list) => {
        this.settings.set(list);
      },
      error: (error) => {
        this.snackService.error(error);
      },
    });
  }

  protected onChange(
    value: number | boolean | string,
    setting: ISetting,
  ): void {
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
    }

    this.adminApiService
      .setSettings([
        {
          key: setting.key,
          value,
        },
      ])
      .pipe(
        finalize(() => {
          this.store.dispatch(AppActions.getPublicSettings());
        }),
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
