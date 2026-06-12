import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { firstValueFrom } from 'rxjs';

import { LoaderStateService } from '@core/services/loader-state.service';

import { MonitorService } from './monitor.service';

describe('Core Services monitor.service', () => {
  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('registers loader on init', () => {
    const service = TestBed.inject(MonitorService);
    const loader = TestBed.inject(LoaderStateService);
    const spy = vi.spyOn(loader, 'addLoader');

    service.init();

    expect(spy).toHaveBeenCalledWith(service.isLoading$, expect.stringContaining('MonitorService'));
  });

  it('loads monitor and updates streams', async () => {
    const service = TestBed.inject(MonitorService);
    const http = TestBed.inject(HttpTestingController);

    const promise = firstValueFrom(service.callMonitor());
    const req = http.expectOne((r) => r.url.includes('/monitor'));
    req.flush({ data: { time: '2024-01-01T00:00:00.000Z', message: 'ok' } });

    const result = await promise;
    const monitor = await firstValueFrom(service.monitor$);
    const hasIssues = await firstValueFrom(service.hasIssues$);

    expect(result.message).toBe('ok');
    expect(monitor?.message).toBe('ok');
    expect(hasIssues).toBe(false);
  });

  it('sets hasIssues and throws when request fails', async () => {
    const service = TestBed.inject(MonitorService);
    const http = TestBed.inject(HttpTestingController);

    const promise = firstValueFrom(service.callMonitor());
    const req = http.expectOne((r) => r.url.includes('/monitor'));
    req.flush('x', { status: 500, statusText: 'Server Error' });

    await expect(promise).rejects.toEqual(new Error('Monitor unavailable'));
    expect(await firstValueFrom(service.hasIssues$)).toBe(true);

    http.verify();
  });
});
