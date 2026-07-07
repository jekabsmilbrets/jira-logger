import { inject, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { type Observable, take } from 'rxjs';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import type { TagManagementCommand } from '@settings/interfaces/tag-management-command.interface';

const successMessages: Record<TagManagementCommand['action'], string> = {
  create: 'Successfully created tag!',
  update: 'Successfully updated tag!',
  delete: 'Successfully deleted tag!',
};

@Service()
export class TagManagementSaveService {
  private readonly matSnackBar: MatSnackBar = inject(MatSnackBar);
  private readonly tagsService: TagsService = inject(TagsService);

  public save(
    command: TagManagementCommand,
  ): void {
    this.createRequest(command)
      .pipe(take(1))
      .subscribe({
        next: () => this.matSnackBar.open(
          successMessages[command.action],
          undefined,
          { duration: 5000 },
        ),
        error: () => undefined,
      });
  }

  private createRequest(
    command: TagManagementCommand,
  ): Observable<Tag | void> {
    switch (command.action) {
      case 'create':
        return this.tagsService.create(command.tag);
      case 'update':
        return this.tagsService.update(command.tag);
      case 'delete':
        return this.tagsService.delete(command.tag);
    }
  }
}
