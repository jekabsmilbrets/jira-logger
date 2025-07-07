<?php

declare(strict_types=1);

namespace App\Service\Tag;

use App\Dto\Tag\TagRequest;
use App\Entity\Tag\Tag;
use App\Factory\Tag\TagFactory;
use App\Repository\Tag\TagRepository;
use Doctrine\Common\Collections\ArrayCollection;

class TagService
{
    final public const NO_DATA_PROVIDED = 'No Tag Model or TagRequest was provided';

    public function __construct(
        private readonly TagRepository $tagRepository,
    ) {
    }

    final public function list(): ?ArrayCollection
    {
        $tags = $this->tagRepository->findAll();

        if (empty($tags) || [] === $tags) {
            return null;
        }

        return new ArrayCollection($tags);
    }

    final public function show(
        string $id
    ): ?Tag {
        $tag = $this->tagRepository->find($id);

        return $tag ?? null;
    }

    final public function new(
        ?TagRequest $tagRequest = null,
        ?Tag $tag = null,
        bool $flush = true,
    ): Tag {
        if (!$tagRequest && !$tag) {
            throw new \RuntimeException(self::NO_DATA_PROVIDED);
        }

        if ($tagRequest && !$tag) {
            $tag = TagFactory::create($tagRequest);
        }

        $this->tagRepository->add(
            tag: $tag,
            flush: $flush
        );

        return $tag;
    }

    final public function edit(
        string $id,
        ?TagRequest $tagRequest = null,
        ?Tag $tag = null,
        bool $flush = true,
    ): ?Tag {
        switch (true) {
            case !$tagRequest && !$tag:
                throw new \RuntimeException(self::NO_DATA_PROVIDED);
            case (!$tagRequest && $tag) && !$tag instanceof Tag:
                return null;

            case $tagRequest && !$tag:
                $tag = $this->tagRepository->find($id);

                if (!$tag instanceof Tag) {
                    return null;
                }

                $tag = TagFactory::create(
                    tagRequest: $tagRequest,
                    tag: $tag
                );
                break;
        }

        if ($flush) {
            $this->tagRepository->flush();
        }

        return $tag;
    }

    final public function delete(
        string $id,
        bool $flush = true,
    ): bool {
        $tag = $this->tagRepository->find($id);

        if (!$tag instanceof Tag) {
            return false;
        }

        $this->tagRepository->remove(
            tag: $tag,
            flush: $flush
        );

        return true;
    }
}
