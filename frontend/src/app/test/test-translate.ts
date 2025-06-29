import { NgModule } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

class FakeTranslateLoader implements TranslateLoader {
  constructor(private readonly translates = {}) {}
  getTranslation(lang: string): Observable<any> {
    return of(this.translates);
  }
}

@NgModule({
  imports: [
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useClass: FakeTranslateLoader,
      },
    }),
  ],
  exports: [TranslateModule],
})
export class TestTranslateModule {}
