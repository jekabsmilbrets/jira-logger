export const select = 'SELECT t.*, EXISTS(SELECT 1 FROM tag_task j WHERE j.tag_id=t.id) AS is_used FROM tag t';
