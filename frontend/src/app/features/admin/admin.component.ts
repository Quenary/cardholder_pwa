import { Component } from '@angular/core';
import { AdminSettingsComponent } from './admin-settings/admin-settings.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
import { AdminStatusComponent } from './admin-status/admin-status.component';

@Component({
  selector: 'app-admin',
  imports: [AdminStatusComponent, AdminSettingsComponent, AdminUsersComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {}
