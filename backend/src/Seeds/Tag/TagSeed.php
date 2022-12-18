<?php

namespace App\Seeds\Tag;

use App\Entity\Tag\Tag;
use Evotodi\SeedBundle\Command\Seed;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class TagSeed extends Seed
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
        return 'tag';
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
        $repository = $manager->getRepository(Tag::class);

        $tags = [
            'CAPEX',
            'OPEX',
            'OTHER',
        ];

        foreach ($tags as $tagName) {
            if (!$repository->findOneBy(['name' => $tagName])) {
                $tag = new Tag();
                $tag->setName($tagName);

                $manager->persist($tag);
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
        $repository = $manager->getRepository(Tag::class);

        $tags = [
            'CAPEX',
            'OPEX',
            'OTHER',
        ];

        $tags = $repository->findBy(
            [
                'name' => $tags,
            ]
        );

        foreach ($tags as $tag) {
            $manager->remove($tag);
        }

        $manager->flush();

        /*
         * Must return an exit code.
         * A value other than 0 or Command::SUCCESS is considered a failed seed load/unload.
         */

        return 0;
    }
}
