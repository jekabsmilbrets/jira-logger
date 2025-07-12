import { LoadableService } from '@shared/interfaces/loadable-service.interface';

export const loadableServicesInitializerFactory: (...services: LoadableService[]) => () => Promise<void> =
  (
    ...services: LoadableService[]
  ): (() => Promise<void>) => () => new Promise(
    (resolve) => {
      services.forEach((service: LoadableService) => {
        service.init();
      });

      resolve();
    },
  );
