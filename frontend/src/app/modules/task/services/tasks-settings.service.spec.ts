import { TestBed } from '@angular/core/testing';

import { TasksSettingsService } from './tasks-settings.service';

describe('TasksSettingsService', () => {
  let service: TasksSettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TasksSettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
