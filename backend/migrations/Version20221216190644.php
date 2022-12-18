<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20221216190644 extends AbstractMigration
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
        $this->addSql('CREATE TABLE setting (id UUID NOT NULL, name VARCHAR(255) NOT NULL, value VARCHAR(512) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_9F74B8985E237E06 ON setting (name)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_9F74B8981D775834 ON setting (value)');
        $this->addSql('COMMENT ON COLUMN setting.id IS \'(DC2Type:uuid)\'');
        $this->addSql('CREATE TABLE tag (id UUID NOT NULL, name VARCHAR(255) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_389B7835E237E06 ON tag (name)');
        $this->addSql('COMMENT ON COLUMN tag.id IS \'(DC2Type:uuid)\'');
        $this->addSql('CREATE TABLE tag_task (tag_id UUID NOT NULL, task_id UUID NOT NULL, PRIMARY KEY(tag_id, task_id))');
        $this->addSql('CREATE INDEX IDX_BC716493BAD26311 ON tag_task (tag_id)');
        $this->addSql('CREATE INDEX IDX_BC7164938DB60186 ON tag_task (task_id)');
        $this->addSql('COMMENT ON COLUMN tag_task.tag_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN tag_task.task_id IS \'(DC2Type:uuid)\'');
        $this->addSql('CREATE TABLE task (id UUID NOT NULL, name VARCHAR(255) NOT NULL, description VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_527EDB255E237E06 ON task (name)');
        $this->addSql('COMMENT ON COLUMN task.id IS \'(DC2Type:uuid)\'');
        $this->addSql('CREATE TABLE time_log (id UUID NOT NULL, task_id UUID NOT NULL, start_time TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, end_time TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, description VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_55BE03AF8DB60186 ON time_log (task_id)');
        $this->addSql('COMMENT ON COLUMN time_log.id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN time_log.task_id IS \'(DC2Type:uuid)\'');
        $this->addSql('ALTER TABLE jira_work_log ADD CONSTRAINT FK_2BD046888DB60186 FOREIGN KEY (task_id) REFERENCES task (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE tag_task ADD CONSTRAINT FK_BC716493BAD26311 FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE tag_task ADD CONSTRAINT FK_BC7164938DB60186 FOREIGN KEY (task_id) REFERENCES task (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE time_log ADD CONSTRAINT FK_55BE03AF8DB60186 FOREIGN KEY (task_id) REFERENCES task (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('ALTER TABLE jira_work_log DROP CONSTRAINT FK_2BD046888DB60186');
        $this->addSql('ALTER TABLE tag_task DROP CONSTRAINT FK_BC716493BAD26311');
        $this->addSql('ALTER TABLE tag_task DROP CONSTRAINT FK_BC7164938DB60186');
        $this->addSql('ALTER TABLE time_log DROP CONSTRAINT FK_55BE03AF8DB60186');
        $this->addSql('DROP TABLE jira_work_log');
        $this->addSql('DROP TABLE setting');
        $this->addSql('DROP TABLE tag');
        $this->addSql('DROP TABLE tag_task');
        $this->addSql('DROP TABLE task');
        $this->addSql('DROP TABLE time_log');
    }
}
