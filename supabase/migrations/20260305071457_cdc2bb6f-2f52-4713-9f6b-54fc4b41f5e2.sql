-- employment_contracts unique constraint
DELETE FROM employment_contracts a USING employment_contracts b
WHERE a.id > b.id AND a.case_id = b.case_id;
ALTER TABLE employment_contracts ADD CONSTRAINT employment_contracts_case_id_key UNIQUE (case_id);