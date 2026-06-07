<?php

declare(strict_types=1);

namespace App\Service\Seed;

use App\Entity\Setting\Setting;
use App\Entity\Tag\Tag;
use Doctrine\ORM\EntityManagerInterface;
use InvalidArgumentException;

class SeedManager
{
    private const SETTING_SEED = 'setting';
    private const TAG_SEED = 'tag';

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * @return list<string>
     */
    public function supportedSeeds(): array
    {
        return [
            self::SETTING_SEED,
            self::TAG_SEED,
        ];
    }

    public function load(string $seedName): void
    {
        match ($seedName) {
            self::SETTING_SEED => $this->loadSettings(),
            self::TAG_SEED => $this->loadTags(),
            default => throw new InvalidArgumentException(sprintf('Unsupported seed "%s".', $seedName)),
        };
    }

    public function unload(string $seedName): void
    {
        match ($seedName) {
            self::SETTING_SEED => $this->unloadSettings(),
            self::TAG_SEED => $this->unloadTags(),
            default => throw new InvalidArgumentException(sprintf('Unsupported seed "%s".', $seedName)),
        };
    }

    private function loadSettings(): void
    {
        $repository = $this->entityManager->getRepository(Setting::class);

        foreach ($this->settingSeedData() as $settingData) {
            if (null !== $repository->findOneBy(['name' => $settingData['name']])) {
                continue;
            }

            $setting = new Setting();
            $setting->setName($settingData['name']);
            $setting->setValue($settingData['value']);

            $this->entityManager->persist($setting);
        }

        $this->entityManager->flush();
        $this->entityManager->clear();
    }

    private function unloadSettings(): void
    {
        $settings = $this->entityManager->getRepository(Setting::class)->findBy([
            'name' => array_map(
                static fn (array $setting): string => $setting['name'],
                $this->settingSeedData(),
            ),
        ]);

        foreach ($settings as $setting) {
            $this->entityManager->remove($setting);
        }

        $this->entityManager->flush();
    }

    private function loadTags(): void
    {
        $repository = $this->entityManager->getRepository(Tag::class);

        foreach ($this->tagSeedData() as $tagName) {
            if (null !== $repository->findOneBy(['name' => $tagName])) {
                continue;
            }

            $tag = new Tag();
            $tag->setName($tagName);

            $this->entityManager->persist($tag);
        }

        $this->entityManager->flush();
        $this->entityManager->clear();
    }

    private function unloadTags(): void
    {
        $tags = $this->entityManager->getRepository(Tag::class)->findBy([
            'name' => $this->tagSeedData(),
        ]);

        foreach ($tags as $tag) {
            $this->entityManager->remove($tag);
        }

        $this->entityManager->flush();
    }

    /**
     * @return list<array{name: string, value: string}>
     */
    private function settingSeedData(): array
    {
        return [
            [
                'name' => 'jira.enabled',
                'value' => 'false',
            ],
            [
                'name' => 'jira.host',
                'value' => 'https://jira.com',
            ],
            [
                'name' => 'jira.personal-access-token',
                'value' => 'jira_personal_access_token',
            ],
            [
                'name' => 'jira.user-time-zone',
                'value' => 'Europe/Riga',
            ],
            [
                'name' => 'jira.locale',
                'value' => 'lv-LV',
            ],
        ];
    }

    /**
     * @return list<string>
     */
    private function tagSeedData(): array
    {
        return [
            'CAPEX',
            'OPEX',
            'OTHER',
        ];
    }
}
