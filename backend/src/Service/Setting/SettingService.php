<?php

declare(strict_types=1);

namespace App\Service\Setting;

use App\Dto\Setting\SettingRequest;
use App\Entity\Setting\Setting;
use App\Repository\Setting\SettingRepository;

class SettingService
{
    final public const REDACTED_VALUE = '***REDACTED***';
    final public const REDACTED_VALUE_NOT_WRITABLE = 'Redacted setting values cannot be stored.';
    private const SECRET_NAME_PARTS = ['token', 'password', 'secret', 'key'];

    public function __construct(
        private readonly SettingRepository $settingRepository,
    ) {
    }

    /**
     * @return list<array{id: string, name: ?string, value: ?string}>|null
     */
    final public function list(): ?array
    {
        $settings = $this->settingRepository->findAll();

        if (empty($settings)) {
            return null;
        }

        return array_map($this->disclose(...), $settings);
    }

    final public function findValue(string $name): ?string
    {
        return $this->settingRepository->findOneBy(
            [
                'name' => $name,
            ]
        )?->getValue();
    }

    final public function booleanValue(string $name): bool
    {
        return filter_var($this->findValue($name), \FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * @return array{id: string, name: ?string, value: ?string}|null
     */
    final public function show(
        string $id
    ): ?array {
        $setting = $this->settingRepository->find($id);

        return $setting instanceof Setting ? $this->disclose($setting) : null;
    }

    /**
     * @return array{id: string, name: ?string, value: ?string}
     */
    final public function create(SettingRequest $settingRequest): array
    {
        $this->assertWritable($settingRequest->getValue());
        $setting = $this->applyRequest($settingRequest);

        $this->settingRepository->save(
            entity: $setting,
            flush: true,
        );

        return $this->disclose($setting);
    }

    /**
     * @return array{id: string, name: ?string, value: ?string}|null
     */
    final public function update(
        string $id,
        SettingRequest $settingRequest,
    ): ?array {
        $setting = $this->settingRepository->find($id);

        if (!$setting instanceof Setting) {
            return null;
        }

        $this->assertWritable($settingRequest->getValue());
        $this->applyRequest($settingRequest, $setting);
        $this->settingRepository->flush();

        return $this->disclose($setting);
    }

    final public function delete(string $id): bool
    {
        $setting = $this->settingRepository->find($id);

        if (!$setting instanceof Setting) {
            return false;
        }

        $this->settingRepository->remove(
            entity: $setting,
            flush: true,
        );

        return true;
    }

    private function applyRequest(SettingRequest $request, ?Setting $setting = null): Setting
    {
        return ($setting ?? new Setting())
            ->setName($request->getName())
            ->setValue($request->getValue());
    }

    /**
     * @return array{id: string, name: ?string, value: ?string}
     */
    private function disclose(Setting $setting): array
    {
        $name = mb_strtolower($setting->getName() ?? '');

        return [
            'id' => $setting->getId(),
            'name' => $setting->getName(),
            'value' => array_any(
                self::SECRET_NAME_PARTS,
                static fn (string $part): bool => str_contains($name, $part),
            ) ? self::REDACTED_VALUE : $setting->getValue(),
        ];
    }

    private function assertWritable(string $value): void
    {
        if (self::REDACTED_VALUE === $value) {
            throw new \DomainException(self::REDACTED_VALUE_NOT_WRITABLE);
        }
    }
}
