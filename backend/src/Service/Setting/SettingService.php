<?php

declare(strict_types=1);

namespace App\Service\Setting;

use App\Dto\Setting\SettingRequest;
use App\Entity\Setting\Setting;
use App\Repository\Setting\SettingRepository;
use Doctrine\Common\Collections\ArrayCollection;

class SettingService
{
    final public const NO_DATA_PROVIDED = 'No Setting Model or SettingRequest was provided';

    private const REDACTED_VALUE = '***REDACTED***';
    private const SECRET_NAME_PARTS = ['token', 'password', 'secret', 'key'];

    public function __construct(
        private readonly SettingRepository $settingRepository,
    ) {
    }

    /**
     * @return ArrayCollection<int, Setting>|null
     */
    final public function list(): ?ArrayCollection
    {
        $settings = $this->settingRepository->findAll();

        if (empty($settings)) {
            return null;
        }

        return new ArrayCollection($settings);
    }

    final public function value(string $name): ?string
    {
        return $this->settingRepository->findOneBy(
            [
                'name' => $name,
            ]
        )?->getValue();
    }

    final public function booleanValue(string $name): bool
    {
        return filter_var($this->value($name), \FILTER_VALIDATE_BOOLEAN);
    }

    final public function safeValue(Setting $setting): ?string
    {
        $name = mb_strtolower($setting->getName() ?? '');

        foreach (self::SECRET_NAME_PARTS as $part) {
            if (str_contains($name, $part)) {
                return self::REDACTED_VALUE;
            }
        }

        return $setting->getValue();
    }

    final public function show(
        string $id
    ): ?Setting {
        $setting = $this->settingRepository->find($id);

        return $setting ?? null;
    }

    final public function new(
        ?SettingRequest $settingRequest = null,
        ?Setting $setting = null,
        bool $flush = true,
    ): Setting {
        if (!$settingRequest && !$setting) {
            throw new \RuntimeException(self::NO_DATA_PROVIDED);
        }

        if ($settingRequest && !$setting) {
            $setting = $this->applyRequest($settingRequest);
        }

        $this->settingRepository->save(
            entity: $setting,
            flush: $flush
        );

        return $setting;
    }

    final public function edit(
        string $id,
        ?SettingRequest $settingRequest = null,
        ?Setting $setting = null,
        bool $flush = true,
    ): ?Setting {
        switch (true) {
            case !$settingRequest && !$setting:
                throw new \RuntimeException(self::NO_DATA_PROVIDED);

            case $settingRequest && !$setting:
                $setting = $this->settingRepository->find($id);

                if (!$setting instanceof Setting) {
                    return null;
                }

                $setting = $this->applyRequest($settingRequest, $setting);
                break;
        }

        if ($flush) {
            $this->settingRepository->flush();
        }

        return $setting;
    }

    final public function delete(
        string $id,
        bool $flush = true,
    ): bool {
        $setting = $this->settingRepository->find($id);

        if (!$setting instanceof Setting) {
            return false;
        }

        $this->settingRepository->remove(
            entity: $setting,
            flush: $flush
        );

        return true;
    }

    private function applyRequest(SettingRequest $request, ?Setting $setting = null): Setting
    {
        $setting ??= new Setting();

        if (null !== ($name = $request->getName())) {
            $setting->setName($name);
        }

        if (null !== ($value = $request->getValue())) {
            $setting->setValue($value);
        }

        return $setting;
    }
}
