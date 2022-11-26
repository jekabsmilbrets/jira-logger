<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20221115201306 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE jira_work_log (id UUID NOT NULL, task_id UUID NOT NULL, work_log_id VARCHAR(255) NOT NULL, description VARCHAR(255) DEFAULT NULL, time_spent_seconds INT NOT NULL, start_time DATE NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_2BD046888DB60186 ON jira_work_log (task_id)');
        $this->addSql('COMMENT ON COLUMN jira_work_log.id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN jira_work_log.task_id IS \'(DC2Type:uuid)\'');
        $this->addSql('ALTER TABLE jira_work_log ADD CONSTRAINT FK_2BD046888DB60186 FOREIGN KEY (task_id) REFERENCES task (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('ALTER TABLE jira_work_log DROP CONSTRAINT FK_2BD046888DB60186');
        $this->addSql('DROP TABLE jira_work_log');
    }
}
