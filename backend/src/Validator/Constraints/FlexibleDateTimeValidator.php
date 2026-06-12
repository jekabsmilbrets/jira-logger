<?php

declare(strict_types=1);

namespace App\Validator\Constraints;

use App\Service\DateTime\DateInputParser;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;

class FlexibleDateTimeValidator extends ConstraintValidator
{
    public function __construct(
        private readonly DateInputParser $dateInputParser,
    ) {
    }

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof FlexibleDateTime) {
            throw new \InvalidArgumentException('Constraint must be FlexibleDateTime.');
        }

        if (null === $value || '' === $value) {
            return;
        }

        if (!\is_string($value) || !$this->dateInputParser->isValidDateTime($value)) {
            $this->context
                ->buildViolation($constraint->message)
                ->addViolation();
        }
    }
}

