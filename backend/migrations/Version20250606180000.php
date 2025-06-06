<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20250606180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Convert all timestamp fields to timestamptz assuming Europe/Riga timezone';
    }

    public function up(Schema $schema): void
    {
        $this->addSql(
            "ALTER TABLE jira_work_log
                ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'Europe/Riga',
                ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'Europe/Riga'"
        );

        $this->addSql(
            "ALTER TABLE setting
                ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'Europe/Riga',
                ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'Europe/Riga'"
        );

        $this->addSql(
            "ALTER TABLE tag
                ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'Europe/Riga',
                ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'Europe/Riga'"
        );

        $this->addSql(
            "ALTER TABLE task
                ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'Europe/Riga',
                ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'Europe/Riga'"
        );

        $this->addSql(
            "ALTER TABLE time_log
                ALTER COLUMN start_time TYPE TIMESTAMPTZ USING start_time AT TIME ZONE 'Europe/Riga',
                ALTER COLUMN end_time TYPE TIMESTAMPTZ USING end_time AT TIME ZONE 'Europe/Riga',
                ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'Europe/Riga',
                ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'Europe/Riga'"
        );
    }

    public function down(Schema $schema): void
    {
        foreach (['jira_work_log', 'setting', 'tag', 'task', 'time_log'] as $table) {
            $this->addSql("
                ALTER TABLE $table
                    ALTER COLUMN created_at TYPE TIMESTAMP(0) WITHOUT TIME ZONE,
                    ALTER COLUMN updated_at TYPE TIMESTAMP(0) WITHOUT TIME ZONE
            ");
        }

        $this->addSql(
            "ALTER TABLE time_log
                ALTER COLUMN start_time TYPE TIMESTAMP(0) WITHOUT TIME ZONE,
                ALTER COLUMN end_time TYPE TIMESTAMP(0) WITHOUT TIME ZONE"
        );
    }
}
