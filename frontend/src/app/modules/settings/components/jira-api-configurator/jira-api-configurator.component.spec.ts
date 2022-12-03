import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JiraApiConfiguratorComponent } from './jira-api-configurator.component';


describe('JiraApiConfiguratorComponent', () => {
  let component: JiraApiConfiguratorComponent;
  let fixture: ComponentFixture<JiraApiConfiguratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JiraApiConfiguratorComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(JiraApiConfiguratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
