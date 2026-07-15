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

    final public function findByName(string $name): ?Setting
    {
        $setting = $this->settingRepository->findOneBy(
            [
                'name' => $name,
            ]
        );

        return $setting ?? null;
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
