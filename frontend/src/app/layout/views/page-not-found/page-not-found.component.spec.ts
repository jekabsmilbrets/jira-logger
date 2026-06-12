import { TestBed } from '@angular/core/testing';

import { PageNotFoundComponent } from './page-not-found.component';

describe('Layout Views page-not-found.component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageNotFoundComponent],
    }).compileComponents();
  });

  it('renders not-found message', () => {
    const fixture = TestBed.createComponent(PageNotFoundComponent);

    fixture.detectChanges();

    const message: string = fixture.nativeElement.textContent;

    expect(message).toContain('Page not found!');
  });
});
