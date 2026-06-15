import { registerLocaleData } from '@angular/common';
import localeLv from '@angular/common/locales/lv';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Column } from '../../interfaces/column.interface';
import { AreYouSureService } from '../../services/are-you-sure.service';
import { TableComponent } from './table.component';

describe('Shared Components table.component', () => {
  const areYouSureService = {
    openDialog: vi.fn(),
  };

  const createComponent = async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent],
      providers: [{ provide: AreYouSureService, useValue: areYouSureService }],
    }).compileComponents();

    const fixture = TestBed.createComponent(TableComponent);
    fixture.componentRef.setInput('columns', []);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  };

  const createColumn = (overrides: Partial<Column> = {}): Column => ({
    columnDef: 'name',
    header: 'Name',
    cell: () => '',
    ...overrides,
  });

  beforeEach(() => {
    registerLocaleData(localeLv, 'lv-LV');
    areYouSureService.openDialog.mockClear();
    areYouSureService.openDialog.mockReturnValue(of(false));
  });

  it('builds displayed columns from visible/non-excluded columns with select/remove actions', async () => {
    const { fixture, component } = await createComponent();
    fixture.componentRef.setInput('columns', [
      createColumn({ columnDef: 'name' }),
      createColumn({ columnDef: 'sync' }),
      createColumn({ columnDef: 'hidden', hidden: true }),
      createColumn({ columnDef: 'excluded', excludeFromLoop: true }),
    ]);
    fixture.componentRef.setInput('enableRemoveAction', true);
    fixture.componentRef.setInput('enableSyncAction', true);
    fixture.componentRef.setInput('isSelectable', true);
    fixture.detectChanges();

    expect(component['displayedColumns']()).toEqual(['select', 'name', 'sync', 'remove']);

    fixture.componentRef.setInput('enableRemoveAction', false);
    fixture.componentRef.setInput('enableSyncAction', false);
    fixture.componentRef.setInput('isSelectable', false);
    fixture.detectChanges();

    expect(component['displayedColumns']()).toEqual(['name', 'sync']);
  });

  it('wires real sort/paginator and nested sorting accessor in ngAfterViewInit', async () => {
    const { fixture, component } = await createComponent();
    const sort = (component as any).sort();
    const paginator = (component as any).paginator();

    const row = { nested: { value: 123 } } as any;
    fixture.componentRef.setInput('data', [row]);
    fixture.detectChanges();

    expect(component['dataSource'].data).toEqual([row]);
    expect(component['dataSource'].sort).toBe(sort);
    expect(component['dataSource'].paginator).toBe(paginator);
    expect(component['dataSource'].sortingDataAccessor(row, 'nested.value')).toBe(123);
  });

  it('maps Date values to timestamps in sorting accessor', async () => {
    const { fixture, component } = await createComponent();
    const date = new Date('2026-05-31T12:00:00.000Z');
    const row = { meta: { createdAt: date } } as any;

    fixture.componentRef.setInput('data', [row]);
    fixture.detectChanges();

    expect(component['dataSource'].sortingDataAccessor(row, 'meta.createdAt')).toBe(date.getTime());
  });

  it('maps null data input to empty data source', async () => {
    const { fixture, component } = await createComponent();

    fixture.componentRef.setInput('data', null);
    fixture.detectChanges();

    expect(component['dataSource'].data).toEqual([]);
  });

  it('checks and toggles selection state', async () => {
    const { fixture, component } = await createComponent();
    const rows = [{ id: 1 } as any, { id: 2 } as any];
    fixture.componentRef.setInput('data', rows);
    fixture.detectChanges();

    expect(component['isAllSelected']()).toBe(false);

    component['masterToggle']();
    expect(component['selection'].selected).toHaveLength(2);
    expect(component['isAllSelected']()).toBe(true);

    component['masterToggle']();
    expect(component['selection'].selected).toHaveLength(0);
    expect(component['isAllSelected']()).toBe(false);
  });

  it('shouldDisplayColumn hides internal or excluded columns', async () => {
    const { component } = await createComponent();

    expect(component['shouldDisplayColumn'](createColumn({ columnDef: 'name' }))).toBe(true);
    expect(component['shouldDisplayColumn'](createColumn({ hidden: true }))).toBe(false);
    expect(component['shouldDisplayColumn'](createColumn({ excludeFromLoop: true }))).toBe(false);
    expect(component['shouldDisplayColumn'](createColumn({ columnDef: 'select' }))).toBe(false);
    expect(component['shouldDisplayColumn'](createColumn({ columnDef: 'remove' }))).toBe(false);
    expect(component['shouldDisplayColumn'](createColumn({ columnDef: 'sync' }))).toBe(false);
  });

  it('emits cell click only for clickable columns', async () => {
    const { component } = await createComponent();
    const emitSpy = vi.spyOn(component['cellClicked'], 'emit');
    const row = { id: 1 } as any;

    component['onCellClick'](row, createColumn({ isClickable: false }));
    component['onCellClick'](row, createColumn({ isClickable: true }));

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith([row, expect.objectContaining({ isClickable: true })]);
  });

  it('emits footer click only for clickable footer cells not disabled', async () => {
    const { fixture, component } = await createComponent();
    const emitSpy = vi.spyOn(component['footerCellClicked'], 'emit');
    const rows = [{ id: 1 } as any];
    fixture.componentRef.setInput('data', rows);
    fixture.detectChanges();

    component['onFooterCellClicked'](createColumn({ isClickable: false }));
    component['onFooterCellClicked'](createColumn({ isClickable: true, disableFooterClick: true }));
    component['onFooterCellClicked'](createColumn({ isClickable: true, disableFooterClick: false }));

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith([rows, expect.objectContaining({ isClickable: true })]);
  });

  it('opens confirmation dialog and emits remove action only when confirmed', async () => {
    const { component } = await createComponent();
    const emitSpy = vi.spyOn(component['removeAction'], 'emit');
    const timeLog = {
      date: new Date('2024-01-01T10:30:00.000Z'),
      startTime: new Date('2024-01-01T10:30:00.000Z'),
      endTime: new Date('2024-01-01T11:00:00.000Z'),
    } as any;

    areYouSureService.openDialog.mockReturnValueOnce(of(false));
    await component['onRemoveAction'](timeLog);
    expect(emitSpy).not.toHaveBeenCalled();

    areYouSureService.openDialog.mockReturnValueOnce(of(true));
    await component['onRemoveAction'](timeLog);

    expect(areYouSureService.openDialog).toHaveBeenCalledTimes(2);
    expect(areYouSureService.openDialog.mock.calls[1][0]).toContain('Time log "');
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith(timeLog);
  });

  it('does not emit remove action when confirmation dialog stream is missing', async () => {
    const { component } = await createComponent();
    const emitSpy = vi.spyOn(component['removeAction'], 'emit');
    const timeLog = {
      date: new Date('2024-01-01T10:30:00.000Z'),
      startTime: new Date('2024-01-01T10:30:00.000Z'),
      endTime: undefined,
    } as any;

    areYouSureService.openDialog.mockReturnValueOnce(undefined);
    await component['onRemoveAction'](timeLog);

    expect(areYouSureService.openDialog).toHaveBeenCalledTimes(1);
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('returns early on remove action when row is null', async () => {
    const { component } = await createComponent();
    const emitSpy = vi.spyOn(component['removeAction'], 'emit');

    await component['onRemoveAction'](null as any);

    expect(areYouSureService.openDialog).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('formats remove confirmation when startTime is missing', async () => {
    const { component } = await createComponent();
    const rowWithoutStartTime = {
      date: new Date('2026-05-01T00:00:00.000Z'),
      endTime: undefined,
    } as any;

    areYouSureService.openDialog.mockReturnValueOnce(undefined);
    await component['onRemoveAction'](rowWithoutStartTime);

    expect(areYouSureService.openDialog).toHaveBeenCalledTimes(1);
    expect(areYouSureService.openDialog.mock.calls[0][0]).toContain('null-null');
  });

  it('reuses the cached confirmation service promise', async () => {
    const { component } = await createComponent();

    const first = component['loadAreYouSureService']();
    const second = component['loadAreYouSureService']();

    const [firstService, secondService] = await Promise.all([first, second]);
    expect(firstService).toBe(secondService);
    expect(firstService).toBe(areYouSureService);
  });

  it('emits sync action with provided row cast as task', async () => {
    const { component } = await createComponent();
    const emitSpy = vi.spyOn(component['syncAction'], 'emit');
    const task = { id: 'task-1', name: 'Task' } as any;

    component['onSyncAction'](task);

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith(task);
  });

  it('renders switch-pipe cell branches and sync/remove/select columns in template', async () => {
    const { fixture, component } = await createComponent();
    const removeSpy = vi.spyOn(component as any, 'onRemoveAction');
    const syncEmitSpy = vi.spyOn(component['syncAction'], 'emit');
    const row = {
      id: '1',
      value: 120,
      when: new Date('2026-05-01T00:00:00.000Z'),
      date: new Date('2026-05-01T10:00:00.000Z'),
      startTime: new Date('2026-05-01T10:00:00.000Z'),
      endTime: new Date('2026-05-01T11:00:00.000Z'),
    } as any;
    fixture.componentRef.setInput('isSelectable', true);
    fixture.componentRef.setInput('enableRemoveAction', true);
    fixture.componentRef.setInput('enableFooter', true);
    fixture.componentRef.setInput('columns', [
      {
        columnDef: 'value',
        header: 'Value',
        sortable: true,
        pipe: 'readableTime',
        isClickable: true,
        cell: () => 120,
        hasFooter: true,
        footerCell: () => 120,
      } as any,
      {
        columnDef: 'when',
        header: 'When',
        sortable: true,
        pipe: 'date',
        cell: () => row.when,
        hasFooter: true,
        footerCell: () => '',
      } as any,
      { columnDef: 'plain', header: 'Plain', sortable: true, cell: () => 'abc', hasFooter: true, footerCell: () => 'x' } as any,
      {
        columnDef: 'sync',
        header: 'Sync',
        sortable: false,
        hidden: false,
        excludeFromLoop: false,
        taskSynced: () => false,
        cell: () => undefined,
      } as any,
    ]);
    fixture.componentRef.setInput('data', [row]);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-header-row'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('mat-paginator'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('button[aria-label="Remove row"]'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('button[aria-label="Sync task to Jira"]'))).toBeTruthy();
    expect(fixture.debugElement.queryAll(By.css('mat-checkbox')).length).toBeGreaterThan(0);

    fixture.debugElement.query(By.css('button[aria-label="Sync task to Jira"]')).nativeElement.click();
    fixture.detectChanges();
    expect(syncEmitSpy).toHaveBeenCalledTimes(1);

    fixture.debugElement.query(By.css('button[aria-label="Remove row"]')).nativeElement.click();
    fixture.detectChanges();
    await removeSpy.mock.results[0]?.value;
    expect(areYouSureService.openDialog).toHaveBeenCalled();
  });

  it('renders non-selectable rows when isSelectable is false', async () => {
    const { fixture, component } = await createComponent();
    fixture.componentRef.setInput('isSelectable', false);
    fixture.componentRef.setInput('columns', [
      { columnDef: 'plain', header: 'Plain', sortable: true, cell: () => 'abc' } as any,
    ]);
    fixture.componentRef.setInput('data', [{ id: '1' } as any]);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('mat-row'))).toBeTruthy();
  });

  it('triggers clickable cell listener via template event', async () => {
    const { fixture, component } = await createComponent();
    const cellSpy = vi.spyOn(component['cellClicked'], 'emit');
    fixture.componentRef.setInput('enableFooter', true);
    fixture.componentRef.setInput('columns', [
      {
        columnDef: 'plain',
        header: 'Plain',
        sortable: true,
        isClickable: true,
        cell: () => 'value',
        hasFooter: true,
        footerCell: () => 'footer',
      } as any,
    ]);
    fixture.componentRef.setInput('data', [{ id: '1' } as any]);
    fixture.detectChanges();

    const clickableCell = fixture.debugElement.query(By.css('.mat-cell-clickable'));
    clickableCell.nativeElement.click();
    const footerCell = fixture.debugElement.query(By.css('mat-footer-cell'));
    if (footerCell) {
      footerCell.triggerEventHandler('click', new MouseEvent('click'));
    }

    expect(cellSpy).toHaveBeenCalledTimes(1);
  });

  it('triggers select checkbox and selectable row click listeners via template events', async () => {
    const { fixture, component } = await createComponent();
    fixture.componentRef.setInput('isSelectable', true);
    fixture.componentRef.setInput('columns', [
      { columnDef: 'plain', header: 'Plain', sortable: true, cell: () => 'abc' } as any,
    ]);
    fixture.componentRef.setInput('data', [{ id: '1' } as any, { id: '2' } as any]);
    fixture.detectChanges();

    const checkboxes = fixture.debugElement.queryAll(By.css('mat-checkbox'));
    checkboxes[0].triggerEventHandler('change', {});
    checkboxes[1].triggerEventHandler('change', {});
    checkboxes[1].triggerEventHandler('click', new MouseEvent('click'));

    fixture.debugElement.query(By.css('mat-row')).triggerEventHandler('click', new MouseEvent('click'));

    expect(component['selection'].selected.length).toBeGreaterThanOrEqual(1);
  });
});
