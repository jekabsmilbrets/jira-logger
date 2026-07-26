import { TestBed } from '@angular/core/testing';

import { PageNotFound } from './page-not-found';

describe('Layout Views page-not-found', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageNotFound],
    }).compileComponents();
  });

  it('renders not-found message', () => {
    const fixture = TestBed.createComponent(PageNotFound);

    fixture.detectChanges();

    const message: string = fixture.nativeElement.textContent;

    expect(message).toContain('Page not found!');
  });
});
