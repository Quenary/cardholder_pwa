import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardScannerComponent } from './card-scanner.component';

describe('CardScannerComponent', () => {
  let component: CardScannerComponent;
  let fixture: ComponentFixture<CardScannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardScannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
