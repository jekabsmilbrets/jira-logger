import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { Tag } from '@shared/models/tag.model';
import { TagsService } from '@shared/services/tags.service';

import type { TagManagementCommand } from '@settings/interfaces/tag-management-command.interface';

import { TagManagementSaveService } from './tag-management-save.service';

describe('Settings Services tag-management-save.service', () => {
  let service: TagManagementSaveService;
  let matSnackBarMock: {
    open: ReturnType<typeof vi.fn>;
  };
  let tagsServiceMock: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    matSnackBarMock = {
      open: vi.fn(),
    };
    tagsServiceMock = {
      create: vi.fn((tag: Tag) => of(tag)),
      update: vi.fn((tag: Tag) => of(tag)),
      delete: vi.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        TagManagementSaveService,
        { provide: MatSnackBar, useValue: matSnackBarMock },
        { provide: TagsService, useValue: tagsServiceMock },
      ],
    });

    service = TestBed.inject(TagManagementSaveService);
  });

  it('routes tag commands to tag requests and opens the matching success snackbar', () => {
    const createEvent: TagManagementCommand = {
      action: 'create',
      tag: new Tag({ name: 'New Tag' }),
    };
    const updateEvent: TagManagementCommand = {
      action: 'update',
      tag: new Tag({ id: 'tag-1', name: 'Updated Tag' }),
    };
    const deleteEvent: TagManagementCommand = {
      action: 'delete',
      tag: new Tag({ id: 'tag-1', name: 'Updated Tag' }),
    };

    service.save(createEvent);
    service.save(updateEvent);
    service.save(deleteEvent);

    expect(tagsServiceMock.create).toHaveBeenCalledWith(createEvent.tag);
    expect(tagsServiceMock.update).toHaveBeenCalledWith(updateEvent.tag);
    expect(tagsServiceMock.delete).toHaveBeenCalledWith(deleteEvent.tag);
    expect(matSnackBarMock.open).toHaveBeenCalledWith('Successfully created tag!', undefined, { duration: 5000 });
    expect(matSnackBarMock.open).toHaveBeenCalledWith('Successfully updated tag!', undefined, { duration: 5000 });
    expect(matSnackBarMock.open).toHaveBeenCalledWith('Successfully deleted tag!', undefined, { duration: 5000 });
  });

  it('does not open a success snackbar when the tag request fails', () => {
    tagsServiceMock.create.mockReturnValueOnce(throwError(() => new Error('save failed')));

    service.save({
      action: 'create',
      tag: new Tag({ name: 'New Tag' }),
    });

    expect(tagsServiceMock.create).toHaveBeenCalledTimes(1);
    expect(matSnackBarMock.open).not.toHaveBeenCalled();
  });
});
