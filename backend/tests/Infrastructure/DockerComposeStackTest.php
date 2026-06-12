<?php

declare(strict_types=1);

namespace App\Tests\Infrastructure;

use PHPUnit\Framework\TestCase;

class DockerComposeStackTest extends TestCase
{
    public function testAssetsInitIsPartOfDefaultStackAndNginxWaitsForIt(): void
    {
        $compose = file_get_contents($this->repoPath('.docker/docker-compose.yml'));
        self::assertIsString($compose);

        $assetsInitBlock = $this->serviceBlock($compose, 'assets-init');
        $nginxBlock = $this->serviceBlock($compose, 'nginx');

        self::assertStringNotContainsString('profiles:', $assetsInitBlock);
        self::assertStringContainsString('assets-init:', $nginxBlock);
        self::assertStringContainsString('condition: service_completed_successfully', $nginxBlock);
    }

    public function testAssetsInitOwnsRuntimeConfigPublicationForSharedAssets(): void
    {
        $assetsInitScript = file_get_contents($this->repoPath('.docker/assets-init/assets-init.sh'));
        $nginxDockerfile = file_get_contents($this->repoPath('.docker/nginx/Dockerfile'));

        self::assertIsString($assetsInitScript);
        self::assertIsString($nginxDockerfile);

        self::assertStringContainsString('ASSETS_DIR="/assets"', $assetsInitScript);
        self::assertStringContainsString('cp -R /work/ng/. "${ASSETS_DIR}/"', $assetsInitScript);
        self::assertStringContainsString('cat > "${ASSETS_DIR}/runtime-config.json"', $assetsInitScript);
        self::assertStringContainsString('printf \'%s\\n\' "${ASSETS_VERSION}" > "${MARKER_FILE}"', $assetsInitScript);

        self::assertGreaterThan(
            strpos($assetsInitScript, 'cat > "${ASSETS_DIR}/runtime-config.json"'),
            strpos($assetsInitScript, 'printf \'%s\\n\' "${ASSETS_VERSION}" > "${MARKER_FILE}"')
        );
        self::assertFalse(file_exists($this->repoPath('.docker/nginx/docker-entrypoint.d/30-runtime-config.sh')));
        self::assertStringNotContainsString('/docker-entrypoint.d/', $nginxDockerfile);
        self::assertStringNotContainsString('30-runtime-config.sh', $nginxDockerfile);
    }

    private function repoPath(string $relativePath): string
    {
        return dirname(__DIR__, 3).'/'.$relativePath;
    }

    private function serviceBlock(string $compose, string $serviceName): string
    {
        $pattern = sprintf(
            '/^  %s:\n(?P<body>(?:^(?:    |\n).*\n?)*)/m',
            preg_quote($serviceName, '/')
        );

        if (!preg_match($pattern, $compose, $matches)) {
            self::fail(sprintf('Service block for "%s" was not found.', $serviceName));
        }

        return $matches['body'];
    }
}
