<?php

declare(strict_types=1);

namespace App\Tests\Validator\Constraints;

use App\Service\DateTime\DateInputParser;
use App\Service\DateTime\UserTimezoneResolver;
use App\Validator\Constraints\FlexibleDateTime;
use App\Validator\Constraints\FlexibleDateTimeValidator;
use Symfony\Component\Validator\Test\ConstraintValidatorTestCase;

class FlexibleDateTimeValidatorTest extends ConstraintValidatorTestCase
{
    protected function createValidator(): FlexibleDateTimeValidator
    {
        $timezoneResolver = $this->createMock(UserTimezoneResolver::class);
        $timezoneResolver
            ->method('resolveCurrentUserTimezone')
            ->willReturn('Europe/Riga');

        return new FlexibleDateTimeValidator(new DateInputParser($timezoneResolver));
    }

    public function testAcceptsUnixTimestamp(): void
    {
        $constraint = new FlexibleDateTime();
        $this->validator->validate('1735689600000', $constraint);

        $this->assertNoViolation();
    }

    public function testRejectsInvalidDateTime(): void
    {
        $constraint = new FlexibleDateTime();
        $this->validator->validate('foo-bar', $constraint);

        $this
            ->buildViolation($constraint->message)
            ->assertRaised();
    }
}

