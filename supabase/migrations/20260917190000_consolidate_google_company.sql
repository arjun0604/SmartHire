UPDATE recruiters
SET company_id = '1108b618-0746-43b4-bfdc-7f28facc55f5'
WHERE company_id = '0f81bd67-8411-4e7d-b7ee-4f84b7617f4b';

UPDATE jobs
SET created_by = 'dd86c650-9f0b-4517-92f3-eeed7f4f5c7b'
WHERE id = '3856c8d5-b41d-41c9-9b42-87abf57a108b';

DELETE FROM companies
WHERE id = '0f81bd67-8411-4e7d-b7ee-4f84b7617f4b';
