<?php

declare(strict_types=1);

// Deliberately independent of .env and the deployed database.
$url = getenv('DATABASE_URL') ?: '';
if (!str_contains($url, '@127.0.0.1:55439/compatibility')) {
    throw new RuntimeException('Compatibility probes require the disposable database.');
}
require dirname(__DIR__).'/backend/vendor/autoload.php';

$kernel = new class('prod', false) extends App\Kernel {
    public function getProjectDir(): string { return dirname(__DIR__).'/backend'; }
    public function getCacheDir(): string { return sys_get_temp_dir().'/jira-logger-compatibility-cache'; }
    public function getBuildDir(): string { return $this->getCacheDir(); }
};
$request = Symfony\Component\HttpFoundation\Request::createFromGlobals();
$response = $kernel->handle($request);
$response->send();
$kernel->terminate($request, $response);
