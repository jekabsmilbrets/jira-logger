<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20221029191759 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE setting (id UUID NOT NULL, name VARCHAR(255) NOT NULL, value VARCHAR(512) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_9F74B8985E237E06 ON setting (name)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_9F74B8981D775834 ON setting (value)');
        $this->addSql('COMMENT ON COLUMN setting.id IS \'(DC2Type:uuid)\'');
        $this->addSql('ALTER TABLE time_log ADD work_log_id VARCHAR(255) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('DROP TABLE setting');
        $this->addSql('ALTER TABLE time_log DROP work_log_id');
    }
}
