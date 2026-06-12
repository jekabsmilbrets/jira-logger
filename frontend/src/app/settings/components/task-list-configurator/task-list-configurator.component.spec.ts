import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { TaskListConfiguratorComponent } from './task-list-configurator.component';

describe('Settings Components task-list-configurator.component', () => {
  let fixture: ComponentFixture<TaskListConfiguratorComponent>;
  let component: TaskListConfiguratorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskListConfiguratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders task list card heading', () => {
    const heading = fixture.debugElement.query(By.css('mat-card-title'))?.nativeElement as HTMLElement;

    expect(heading.textContent?.trim()).toBe('Task List');
  });

  it('uses false as the default disabled input', () => {
    expect(component.disabled()).toBe(false);
  });

  it('accepts disabled input updates', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(component.disabled()).toBe(true);
  });
});
