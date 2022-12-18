<?php

namespace App\Seeds\Setting;

use App\Entity\Setting\Setting;
use Evotodi\SeedBundle\Command\Seed;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class SettingSeed extends Seed
{
    /**
     * Return the name of your seed.
     */
    public static function seedName(): string
    {
        /*
         * The seed won't load if this is not set
         * The resulting command will be seed:user
         */
        return 'setting';
    }

    /**
     * Optional ordering of the seed load/unload.
     * Seeds are loaded/unloaded in ascending order starting from 0.
     * Multiple seeds with the same order are randomly loaded.
     */
    public static function getOrder(): int
    {
        return 0;
    }

    /**
     * The load method is called when loading a seed.
     */
    final public function load(InputInterface $input, OutputInterface $output): int
    {
        /*
         * Doctrine logging eats a lot of memory, this is a wrapper to disable logging
         */
        $this->disableDoctrineLogging();
        $manager = $this->getManager();
        $repository = $manager->getRepository(Setting::class);

        $tags = [
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
                'value' => 'token-1231-asd',
            ],
        ];

        foreach ($tags as $settingData) {
            if (!$repository->findOneBy(['name' => $settingData['name']])) {
                $setting = new Setting();
                $setting->setName($settingData['name']);
                $setting->setValue($settingData['value']);

                $manager->persist($setting);
            }
        }

        $manager->flush();
        $manager->clear();

        /*
         * Must return an exit code.
         * A value other than 0 or Command::SUCCESS is considered a failed seed load/unload.
         */

        return 0;
    }

    /**
     * The unload method is called when unloading a seed.
     */
    final public function unload(InputInterface $input, OutputInterface $output): int
    {
        // Clear the table
        $manager = $this->getManager();
        $repository = $manager->getRepository(Setting::class);

        $settings = [
            'jira.enabled',
            'jira.host',
            'jira.personal-access-token',
        ];

        $settings = $repository->findBy(
            [
                'name' => $settings,
            ]
        );

        foreach ($settings as $setting) {
            $manager->remove($setting);
        }

        $manager->flush();

        /*
         * Must return an exit code.
         * A value other than 0 or Command::SUCCESS is considered a failed seed load/unload.
         */

        return 0;
    }
}
