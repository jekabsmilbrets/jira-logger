import { HttpErrorResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { adaptSetting, adaptSettings } from '@core/adapters/api-setting.adapter';
import { ApiSetting } from '@core/interfaces/api/api-setting.interface';
import { Setting } from '@core/models/setting.model';
import { LoaderStateService } from '@core/services/loader-state.service';

import { ErrorDialogDataInterface } from '@shared/interfaces/error-dialog-data.interface';
import { ErrorDialogService } from '@shared/services/error-dialog.service';

import { Observable, of, take } from 'rxjs';

import { environment } from '../../../../environments/environment';

import { SettingsService } from './settings.service';

const testId = '13d0305b-d6f2-4344-bb30-d5100d56f568';
const testName = 'JIRA-LOGGER-0001';

const testSettings: ApiSetting[] = [
  {
    id: testId,
    name: testName,
    value: 'test1',
    createdAt: '2022-11-12T18:41:16.653Z',
  },
];

class LoaderStateServiceStub {
  public addLoader(loader: Observable<boolean>, name?: string): void {
  }
}

class ErrorDialogServiceStub {
  public openDialog(
    errorData: ErrorDialogDataInterface,
  ): Observable<undefined> {
    return of(undefined);
  }
}

describe('SettingsService', () => {
  let httpMock: HttpTestingController;
  let service: SettingsService;
  let loaderStateService: LoaderStateService;
  let errorDialogService: ErrorDialogService;
  let waitForTurnSpy: jasmine.Spy<any>;
  let isLoadingSubjectSpy: jasmine.Spy<any>;
  let processErrorSpy: jasmine.Spy<any>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        { provide: LoaderStateService, useClass: LoaderStateServiceStub },
        { provide: ErrorDialogService, useClass: ErrorDialogServiceStub },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(SettingsService);
    loaderStateService = TestBed.inject(LoaderStateService);
    errorDialogService = TestBed.inject(ErrorDialogService);

    waitForTurnSpy = spyOn(service as any, 'waitForTurn').and.callThrough();
    isLoadingSubjectSpy = spyOn((service as any).isLoadingSubject, 'next').and.callThrough();
    processErrorSpy = spyOn(service as any, 'processError').and.callThrough();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it(
    'should be created',
    () => {
      expect(service).toBeTruthy();
    },
  );

  it(
    'should call method "list" and "addLoader" on LoaderStateService on method "init" call',
    () => {
      spyOn(service, 'list').and.returnValue(of([]));
      spyOn(loaderStateService, 'addLoader').and.callThrough();

      service.init();

      expect(loaderStateService.addLoader).toHaveBeenCalled();
    },
  );

  it(
    'should call method "list" on calling method "reloadList"',
    () => {
      const testResponse: Setting[] = [];
      const listSpy = spyOn(service, 'list').and.returnValue(of(testResponse));

      (service as any).reloadList()
        .pipe(take(1))
        .subscribe(
          (response: Setting[]) => {
            expect(listSpy).toHaveBeenCalled();
            expect(response).toEqual(testResponse);
          },
        );
    },
  );

  it(
    'should return cached Settings on calling method "reloadList with arg "true"',
    () => {
      const adaptedSettings: Setting[] = adaptSettings(testSettings);
      (service as any).settingsSubject.next(adaptedSettings);
      const listSpy = spyOn(service, 'list').and.callThrough();

      (service as any).reloadList(true)
        .pipe(take(1))
        .subscribe(
          (response: Setting[]) => {
            expect(listSpy).not.toHaveBeenCalled();
            expect(response).toEqual(adaptedSettings);
          },
        );
    },
  );

  it(
    'should find Setting in Setting list on calling method "findSetting"',
    () => {
      const adaptedSettings: Setting[] = adaptSettings(testSettings);
      adaptedSettings.push(
        new Setting({
          name: 'test2',
          value: 'test2',
        }),
      );

      const foundSetting: Setting = (service as any).findSetting(adaptedSettings, adaptedSettings[1]);

      expect(foundSetting).toEqual(adaptedSettings[1]);
    },
  );

  it(
    'should throw error on trying to find nonexistent Setting on calling method "findSetting"',
    () => {
      const adaptedSettings: Setting[] = adaptSettings(testSettings);
      const testSetting: Setting = new Setting({
        name: 'test2',
        value: 'test2',
      });

      try {
        (service as any).findSetting(adaptedSettings, testSetting);
      } catch (e: any) {
        expect(e.message).toEqual(`Problems creating setting "${ testSetting.name }"!`);
      }
    },
  );

  it(
    `should update isLoadingSubject, call "errorDialogService.openDialog" and 
    rethrow error on calling method "processError"`,
    () => {
      const testError: HttpErrorResponse = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Error',
        url: 'https://jira-logger.io/api/setting',
        error: 'Internal Error',
      });
      const openDialogSpy = spyOn(errorDialogService, 'openDialog').and.returnValue(of(undefined));
      const adaptedSettings: Setting[] = adaptSettings(testSettings);
      (service as any).settingsSubject.next(adaptedSettings);

      (service as any).processError(testError)
        .pipe(take(1))
        .subscribe(
          () => fail('should have failed'),
          (error: HttpErrorResponse) => {
            expect(isLoadingSubjectSpy).toHaveBeenCalled();
            expect(openDialogSpy).toHaveBeenCalledWith(
              {
                errorTitle: 'Error while doing db action :D',
                errorMessage: JSON.stringify(testError),
                idbData: adaptedSettings,
              },
            );
            expect(error.status).toEqual(500);
          },
        );
    },
  );

  describe(
    'fetching Settings from API via method "list"',
    () => {
      afterEach(() => {
        httpMock.verify();
      });

      it(
        'should try to fetch all Settings with API GET request',
        () => {
          const url = `${ environment.apiHost }${ environment.apiBase }/${ (service as any).basePath }`;

          service.list()
            .pipe(take(1))
            .subscribe(
              (response: Setting[]) => {
                expect(waitForTurnSpy).toHaveBeenCalled();
                expect(isLoadingSubjectSpy).toHaveBeenCalled();
                expect(response[0]).toBeInstanceOf(Setting);
                expect(response[0]).toEqual(adaptSetting(testSettings[0]));
                expect(response.length).toEqual(testSettings.length);
              },
            );

          const request = httpMock.expectOne(url);
          expect(request.request.method).toEqual('GET');
          request.flush({ data: testSettings });
        },
      );

      it(
        `should return empty array when try to fetch all Settings with API GET request but receives 404`,
        () => {
          const url = `${ environment.apiHost }${ environment.apiBase }/${ (service as any).basePath }`;
          const errorMsg = 'Tasks not found';

          service.list()
            .pipe(take(1))
            .subscribe(
              (response: Setting[]) => {
                expect(waitForTurnSpy).toHaveBeenCalled();
                expect(isLoadingSubjectSpy).toHaveBeenCalled();
                expect(response.length).toEqual(0);
              },
            );

          const request = httpMock.expectOne(url);
          expect(request.request.method).toEqual('GET');
          request.flush(
            errorMsg,
            {
              status: 404,
              statusText: 'Not Found',
            },
          );
        },
      );

      it(
        `should throw error when try to fetch all Settings with API GET request but receives error`,
        () => {
          const url = `${ environment.apiHost }${ environment.apiBase }/${ (service as any).basePath }`;
          const errorMsg = 'Internal Error';

          service.list()
            .pipe(take(1))
            .subscribe({
                next: (response: Setting[]) => fail('should have failed'),
                error: (error: HttpErrorResponse) => {
                  expect(waitForTurnSpy).toHaveBeenCalled();
                  expect(isLoadingSubjectSpy).toHaveBeenCalled();
                  expect(processErrorSpy).toHaveBeenCalled();
                  expect(error.status).toEqual(500);
                },
              },
            );

          const request = httpMock.expectOne(url);
          expect(request.request.method).toEqual('GET');
          request.flush(
            errorMsg,
            {
              status: 500,
              statusText: 'Internal Error',
            },
          );
        },
      );
    },
  );

  describe(
    'creating Setting at API via method "create"',
    () => {
      const testCreateSetting: Setting = new Setting({
        name: testName,
        value: 'test',
      });

      afterEach(() => {
        httpMock.verify();
      });

      it(
        'should return newly created Setting with API POST request',
        () => {
          const url = `${ environment.apiHost }${ environment.apiBase }/${ (service as any).basePath }`;
          const skipReload = false;
          const createResponseApiSetting: Partial<ApiSetting> = {
            ...testCreateSetting,
            id: testId,
          };
          const adaptedSettings: Setting[] = adaptSettings([...testSettings, createResponseApiSetting as ApiSetting]);
          const adaptedApiSetting: Setting = adaptedSettings[1];
          const reloadListSpy = spyOn((service as any), 'reloadList').and.returnValue(of(adaptedSettings));
          const findSettingSpy = spyOn((service as any), 'findSetting').and.returnValue(adaptedApiSetting);

          service.create(testCreateSetting, skipReload)
            .pipe(take(1))
            .subscribe(
              (response: Setting) => {
                expect(waitForTurnSpy).toHaveBeenCalled();
                expect(isLoadingSubjectSpy).toHaveBeenCalled();
                expect(reloadListSpy).toHaveBeenCalledWith(skipReload);
                expect(findSettingSpy).toHaveBeenCalled();
                expect(response).toBeInstanceOf(Setting);
                expect(response).toEqual(adaptedApiSetting);
              },
            );

          const request = httpMock.expectOne(url);
          expect(request.request.method).toEqual('POST');
          request.flush({
            data: createResponseApiSetting as ApiSetting,
          });
        },
      );

      it(
        `should throw error when try to create Setting at API on calling method "create" but receives error`,
        () => {
          const url = `${ environment.apiHost }${ environment.apiBase }/${ (service as any).basePath }`;
          const errorMsg = 'Internal Error';

          service.create(testCreateSetting)
            .pipe(take(1))
            .subscribe({
                next: () => fail('should have failed'),
                error: (error: HttpErrorResponse) => {
                  expect(waitForTurnSpy).toHaveBeenCalled();
                  expect(isLoadingSubjectSpy).toHaveBeenCalled();
                  expect(processErrorSpy).toHaveBeenCalled();
                  expect(error.status).toEqual(500);
                },
              },
            );

          const request = httpMock.expectOne(url);
          expect(request.request.method).toEqual('POST');
          request.flush(
            errorMsg,
            {
              status: 500,
              statusText: 'Internal Error',
            },
          );
        },
      );
    },
  );

  describe(
    'updating Setting at API via method "update"',
    () => {
      const testUpdateSetting: Setting = new Setting({
        id: testId,
        name: testName,
        value: 'test',
      });

      afterEach(() => {
        httpMock.verify();
      });

      it(
        'should return updated Setting with API PATCH request',
        () => {
          const url = `${ environment.apiHost }${ environment.apiBase }/${ (service as any).basePath }/${ testId }`;
          const skipReload = false;
          const updateResponseApiSetting: Partial<ApiSetting> = {
            ...testUpdateSetting,
          };
          const adaptedSettings: Setting[] = adaptSettings([...testSettings, updateResponseApiSetting as ApiSetting]);
          const adaptedApiSetting: Setting = adaptedSettings[1];
          const reloadListSpy = spyOn((service as any), 'reloadList').and.returnValue(of(adaptedSettings));
          const findSettingSpy = spyOn((service as any), 'findSetting').and.returnValue(adaptedApiSetting);

          service.update(testUpdateSetting, skipReload)
            .pipe(take(1))
            .subscribe(
              (response: Setting) => {
                expect(waitForTurnSpy).toHaveBeenCalled();
                expect(isLoadingSubjectSpy).toHaveBeenCalled();
                expect(reloadListSpy).toHaveBeenCalledWith(skipReload);
                expect(findSettingSpy).toHaveBeenCalled();
                expect(response).toBeInstanceOf(Setting);
                expect(response).toEqual(adaptedApiSetting);
              },
            );

          const request = httpMock.expectOne(url);
          expect(request.request.method).toEqual('PATCH');
          request.flush({
            data: updateResponseApiSetting as ApiSetting,
          });
        },
      );

      it(
        `should throw error when try to update Setting at API on calling method "update" but receives error`,
        () => {
          const url = `${ environment.apiHost }${ environment.apiBase }/${ (service as any).basePath }/${ testId }`;
          const errorMsg = 'Internal Error';

          service.update(testUpdateSetting)
            .pipe(take(1))
            .subscribe({
                next: () => fail('should have failed'),
                error: (error: HttpErrorResponse) => {
                  expect(waitForTurnSpy).toHaveBeenCalled();
                  expect(isLoadingSubjectSpy).toHaveBeenCalled();
                  expect(processErrorSpy).toHaveBeenCalled();
                  expect(error.status).toEqual(500);
                },
              },
            );

          const request = httpMock.expectOne(url);
          expect(request.request.method).toEqual('PATCH');
          request.flush(
            errorMsg,
            {
              status: 500,
              statusText: 'Internal Error',
            },
          );
        },
      );
    },
  );

  describe(
    'deleting Setting from API via method "delete"',
    () => {
      const testDeleteSetting: Setting = new Setting({
        id: testId,
      });

      afterEach(() => {
        httpMock.verify();
      });

      it(
        'should delete Setting with API DELETE request',
        () => {
          const url = `${ environment.apiHost }${ environment.apiBase }/${ (service as any).basePath }/${ testId }`;
          const adaptedSettings: Setting[] = adaptSettings(testSettings);
          const listSpy = spyOn(service, 'list').and.returnValue(of(adaptedSettings));

          service.delete(testDeleteSetting)
            .pipe(take(1))
            .subscribe(
              () => {
                expect(waitForTurnSpy).toHaveBeenCalled();
                expect(isLoadingSubjectSpy).toHaveBeenCalled();
                expect(listSpy).toHaveBeenCalled();
              },
            );

          const request = httpMock.expectOne(url);
          expect(request.request.method).toEqual('DELETE');
          request.flush(null);
        },
      );

      it(
        `should throw error when try to delete Setting at API on calling method "delete" but receives error`,
        () => {
          const url = `${ environment.apiHost }${ environment.apiBase }/${ (service as any).basePath }/${ testId }`;
          const errorMsg = 'Internal Error';

          service.delete(testDeleteSetting)
            .pipe(take(1))
            .subscribe({
                next: () => fail('should have failed'),
                error: (error: HttpErrorResponse) => {
                  expect(waitForTurnSpy).toHaveBeenCalled();
                  expect(isLoadingSubjectSpy).toHaveBeenCalled();
                  expect(processErrorSpy).toHaveBeenCalled();
                  expect(error.status).toEqual(500);
                },
              },
            );

          const request = httpMock.expectOne(url);
          expect(request.request.method).toEqual('DELETE');
          request.flush(
            errorMsg,
            {
              status: 500,
              statusText: 'Internal Error',
            },
          );
        },
      );
    },
  );
});
