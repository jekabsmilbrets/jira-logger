# Test

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 13.2.4.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Running docker mode

To run in docker mode you have to have docker and docker-compose installed;

1) You must run `npm run docker-compose-build` to build node image ( **Do it only once!** )
2) Run `npm run docker-compose-start` to start docker containers
   1) Or run `npm run docker-compose-start-background` to start docker containers in background
3) Run `npm run docker-watch` for dev build with watch ( **Will output in console while running!** )
   1) Run `npm run docker-watch-prod` for prod build with watch ( **Will output in console while running!** )
   2) Run `npm run docker-build` for dev build ( **Will output in console while running!** )
   3) Run `npm run docker-build-prod` for prod build ( **Will output in console while running!** )
4) access Jira-logger via http://jira-logger.localhost/
5) access Traefik via http://localhost:8080/dashboard/#/
