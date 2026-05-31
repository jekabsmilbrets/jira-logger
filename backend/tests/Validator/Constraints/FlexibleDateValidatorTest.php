<?php

declare(strict_types=1);

namespace App\Tests\Validator\Constraints;

use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\UserTimezoneResolver;
use App\Validator\Constraints\FlexibleDate;
use App\Validator\Constraints\FlexibleDateValidator;
use Symfony\Component\Validator\Test\ConstraintValidatorTestCase;

class FlexibleDateValidatorTest extends ConstraintValidatorTestCase
{
    protected function createValidator(): FlexibleDateValidator
    {
        $timezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $timezoneResolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn('Europe/Riga');

        return new FlexibleDateValidator(new DateInputParser($timezoneResolver));
    }

    public function testAcceptsEuSlashDate(): void
    {
        $constraint = new FlexibleDate();
        $this->validator->validate('31/05/2026', $constraint);

        $this->assertNoViolation();
    }

    public function testRejectsInvalidDate(): void
    {
        $constraint = new FlexibleDate();
        $this->validator->validate('31/31/2026', $constraint);

        $this
            ->buildViolation($constraint->message)
            ->assertRaised();
    }
}
