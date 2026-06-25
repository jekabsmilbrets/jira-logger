# JIRA Logger Backend

Symfony API for JIRA Logger.

## Requirements

- PHP `>=8.5.4 <9.0`
- Composer
- PostgreSQL

## Install

Install the dependency versions from `composer.lock`:

```bash
composer install
```

## Console

List available commands:

```bash
php bin/console
```

Inspect registered routes:

```bash
php bin/console debug:router
```

Clear the cache:

```bash
php bin/console cache:clear
```

## Database migrations

Check migration status:

```bash
php bin/console doctrine:migrations:status
```

Run pending migrations:

```bash
php bin/console doctrine:migrations:migrate
```

Generate a migration after changing entity mappings:

```bash
php bin/console doctrine:migrations:diff
```

Validate Doctrine mappings:

```bash
php bin/console doctrine:schema:validate
```

Review generated migrations before committing them.

## Tests

Run the test suite:

```bash
vendor/bin/phpunit
```

Run a specific test:

```bash
vendor/bin/phpunit --filter TestName
```

## Static analysis

Run PHPStan:

```bash
composer php-stan
```

## Code formatting

Run PHP CS Fixer:

```bash
composer format
```

## Composer checks

Validate Composer metadata:

```bash
composer validate --strict
```

Audit dependencies:

```bash
composer audit
```

Check platform requirements:

```bash
composer check-platform-reqs
```

List outdated packages:

```bash
composer outdated
```

## Source structure

```text
src/
├── Command/
├── Controller/
│   ├── API/
│   └── Web/
├── Doctrine/
├── Dto/
├── Entity/
├── Exception/
├── Repository/
├── Service/
└── Utility/
```

## Architecture

### Controllers

Controllers define routes, deserialize input, validate DTOs, invoke services, and return responses.

Keep controllers thin. Do not place persistence queries, Jira communication, or time calculations directly in controllers.

### DTOs

DTOs define typed request data, filters, and validation rules.

Use DTOs for:

- create requests;
- update requests;
- list filters;
- date input;
- structured validation.

### Services

Services contain application workflows.

Examples include:

- task operations;
- time-log operations;
- Jira synchronization;
- settings access;
- date and timezone handling;
- report calculations.

### Entities and repositories

Entities represent persisted state and relationships.

Repositories contain reusable database queries and filtering logic.

### Utilities

Utilities contain stateless helper logic, such as duration and time-range calculations.

## API

The API is exposed under `/api`.

Main endpoint groups:

```text
/api/task
/api/task/{taskId}/time-log
/api/tag
/api/setting
/api/jira-work-log
/api/monitor
```

When changing an endpoint:

1. update or add the request DTO;
2. add validation rules;
3. keep controller logic minimal;
4. implement the workflow in a service;
5. update OpenAPI attributes;
6. add or update tests.

## Response format

Successful responses generally use `data`:

```json
{
  "data": {}
}
```

Error responses generally use `errors`:

```json
{
  "errors": [
    "Error message"
  ]
}
```

Preserve the existing response format when extending the API.

## Jira integration

Jira communication uses `lesstif/php-jira-rest-client`.

The backend supports:

- creating work logs;
- updating work logs;
- deleting work logs;
- mapping task names to Jira issue keys;
- calculating reportable durations;
- storing Jira work-log metadata;
- logging integration failures.

Relevant setting keys:

```text
jira.enabled
jira.host
jira.personal-access-token
```

Task names used for synchronization should match Jira issue keys, for example:

```text
PROJECT-123
```

The minimum reportable work-log duration is 60 seconds.

Do not log access tokens, authorization headers, passwords, or database credentials.

## Development conventions

- Use `declare(strict_types=1);`.
- Use explicit parameter and return types.
- Prefer DTOs over unstructured arrays.
- Use constructor injection.
- Keep controllers thin.
- Put queries in repositories.
- Put workflows in services.
- Add migrations for mapping changes.
- Update OpenAPI metadata for API changes.
- Add tests for validation and error handling.
- Do not expose internal exceptions or secrets in responses.

## Before committing

Run:

```bash
composer validate --strict
composer audit
composer php-stan
composer format
vendor/bin/phpunit
```

Verify that:

- entity changes include a migration;
- migrations were reviewed;
- API changes include OpenAPI metadata;
- validation behavior is tested;
- integration failures do not expose credentials;
- date and timezone edge cases are covered.
