import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom, of } from 'rxjs';

import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';

import { ErrorDialogService } from '@shared/services/error-dialog.service';

import { SettingsService } from './settings.service';

describe('Core Services settings.service', () => {
  let service: SettingsService;
  let http: HttpTestingController;
  let errorDialogService: { openDialog: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.resetTestingModule();
    errorDialogService = {
      openDialog: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: ErrorDialogService, useValue: errorDialogService },
      ],
    });

    service = TestBed.inject(SettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('registers loader and preloads on init', () => {
    const loader = TestBed.inject(LoaderStateService);
    const spy = vi.spyOn(loader, 'addLoader');

    service.init();

    expect(spy).toHaveBeenCalledWith(service.isLoading$, expect.stringContaining('SettingsService'));
    http.expectOne((r) => r.url.includes('/setting')).flush({ data: [] });
  });

  it('lists settings', async () => {
    const promise = firstValueFrom(service.list());

    const req = http.expectOne((r) => r.url.includes('/setting'));
    req.flush({ data: [{ id: '1', name: 'theme', value: 'dark', createdAt: '2024-01-01T00:00:00.000Z' }] });

    const result = await promise;
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('theme');
    expect((await firstValueFrom(service.settings$))).toHaveLength(1);
  });

  it('returns empty list on 404', async () => {
    const promise = firstValueFrom(service.list());

    const req = http.expectOne((r) => r.url.includes('/setting'));
    req.flush('nf', { status: 404, statusText: 'Not Found' });

    await expect(promise).resolves.toEqual([]);
  });

  it('creates and reloads list', async () => {
    const setting = new Setting({ name: 'theme', value: 'dark' });

    const promise = firstValueFrom(service.create(setting));

    const post = http.expectOne((r) => r.method === 'POST' && r.url.includes('/setting'));
    expect(post.request.body).toEqual({ name: 'theme', value: 'dark' });
    post.flush({ data: [] });

    const list = http.expectOne((r) => r.method === 'GET' && r.url.includes('/setting'));
    list.flush({ data: [{ id: '1', name: 'theme', value: 'dark', createdAt: '2024-01-01T00:00:00.000Z' }] });

    const result = await promise;
    expect(result.id).toBe('1');
  });

  it('updates and uses skipReload branch', async () => {
    const existing = new Setting({ id: '1', name: 'theme', value: 'dark', createdAt: new Date('2024-01-01T00:00:00.000Z') });
    (service as any).settingsSignal.set([existing]);

    const promise = firstValueFrom(service.update(existing, true));

    const patch = http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/setting/1'));
    expect(patch.request.body).toEqual({ id: '1', name: 'theme', value: 'dark' });
    patch.flush({ data: [] });

    await expect(promise).resolves.toBe(existing);
  });

  it('deletes and returns void', async () => {
    const setting = new Setting({ id: '1', name: 'theme', value: 'dark' });

    const promise = firstValueFrom(service.delete(setting));

    http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/setting/1')).flush({});
    http.expectOne((r) => r.method === 'GET' && r.url.includes('/setting')).flush({ data: [] });

    await expect(promise).resolves.toBeUndefined();
  });

  it('throws when reloaded list does not contain created setting', async () => {
    const setting = new Setting({ name: 'theme', value: 'dark' });

    const promise = firstValueFrom(service.create(setting));

    http.expectOne((r) => r.method === 'POST').flush({ data: [] });
    http.expectOne((r) => r.method === 'GET').flush({
      data: [{
        id: '2',
        name: 'other',
        value: 'x',
        createdAt: '2024-01-01T00:00:00.000Z',
      }],
    });

    await expect(promise).rejects.toThrow('Problems creating setting "theme"!');
  });

  it('opens error dialog and rethrows on non-404 list error', async () => {
    const promise = firstValueFrom(service.list());
    http.expectOne((r) => r.method === 'GET').flush('x', { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toMatchObject({ status: 500, statusText: 'Server Error' });
    expect(errorDialogService.openDialog).toHaveBeenCalledOnce();
  });

  it('opens error dialog on create error', async () => {
    const setting = new Setting({ name: 'theme', value: 'dark' });
    const promise = firstValueFrom(service.create(setting));

    http.expectOne((r) => r.method === 'POST').flush('x', { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toMatchObject({ status: 500, statusText: 'Server Error' });
    expect(errorDialogService.openDialog).toHaveBeenCalled();
  });

  it('opens error dialog on update error', async () => {
    const setting = new Setting({ id: '1', name: 'theme', value: 'dark' });
    const promise = firstValueFrom(service.update(setting));

    http.expectOne((r) => r.method === 'PATCH').flush('x', { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toMatchObject({ status: 500, statusText: 'Server Error' });
    expect(errorDialogService.openDialog).toHaveBeenCalled();
  });

  it('opens error dialog on delete error', async () => {
    const setting = new Setting({ id: '1', name: 'theme', value: 'dark' });
    const promise = firstValueFrom(service.delete(setting));

    http.expectOne((r) => r.method === 'DELETE').flush('x', { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toMatchObject({ status: 500, statusText: 'Server Error' });
    expect(errorDialogService.openDialog).toHaveBeenCalled();
  });
});
