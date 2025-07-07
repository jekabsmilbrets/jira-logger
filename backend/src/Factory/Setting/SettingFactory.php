<?php

declare(strict_types=1);

namespace App\Factory\Setting;

use App\Dto\Setting\SettingRequest;
use App\Entity\Setting\Setting;

class SettingFactory
{
    final public static function create(
        SettingRequest $settingRequest,
        ?Setting $setting = null,
    ): Setting {
        if (null === $setting) {
            $setting = new Setting();
        }

        if (null !== ($name = $settingRequest->getName())) {
            $setting->setName($name);
        }

        if (null !== ($value = $settingRequest->getValue())) {
            $setting->setValue($value);
        }

        return $setting;
    }
}
