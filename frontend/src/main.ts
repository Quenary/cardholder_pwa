import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { storageJson } from './extensions/local-storage-json'

storageJson()

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);
