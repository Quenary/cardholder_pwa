import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardCodeViewerComponent } from './card-code-viewer.component';

describe('CardCodeViewerComponent', () => {
  let component: CardCodeViewerComponent;
  let fixture: ComponentFixture<CardCodeViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardCodeViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardCodeViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
