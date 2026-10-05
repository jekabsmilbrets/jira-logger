-- One consistent PostgreSQL snapshot; all source relations are read-only.
CREATE TEMP TABLE export_result (snapshot jsonb) ON COMMIT PRESERVE ROWS;
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL TIME ZONE 'UTC';
LOCK TABLE public.task, public.tag, public.setting, public.time_log, public.jira_work_log, public.tag_task IN ACCESS SHARE MODE;
DO $export$
DECLARE
  expected jsonb := '{"task":[{"name":"id","type":"uuid","nullable":false,"length":null,"precision":null},{"name":"name","type":"character varying","nullable":false,"length":255,"precision":null},{"name":"description","type":"character varying","nullable":true,"length":255,"precision":null},{"name":"created_at","type":"timestamp","nullable":false,"length":null,"precision":0},{"name":"updated_at","type":"timestamp","nullable":false,"length":null,"precision":0}],"tag":[{"name":"id","type":"uuid","nullable":false,"length":null,"precision":null},{"name":"name","type":"character varying","nullable":false,"length":255,"precision":null},{"name":"created_at","type":"timestamp","nullable":false,"length":null,"precision":0},{"name":"updated_at","type":"timestamp","nullable":false,"length":null,"precision":0}],"setting":[{"name":"id","type":"uuid","nullable":false,"length":null,"precision":null},{"name":"name","type":"character varying","nullable":false,"length":255,"precision":null},{"name":"value","type":"character varying","nullable":false,"length":512,"precision":null},{"name":"created_at","type":"timestamp","nullable":false,"length":null,"precision":0},{"name":"updated_at","type":"timestamp","nullable":false,"length":null,"precision":0}],"time_log":[{"name":"id","type":"uuid","nullable":false,"length":null,"precision":null},{"name":"task_id","type":"uuid","nullable":false,"length":null,"precision":null},{"name":"start_time","type":"timestamp","nullable":false,"length":null,"precision":0},{"name":"end_time","type":"timestamp","nullable":true,"length":null,"precision":0},{"name":"description","type":"character varying","nullable":true,"length":255,"precision":null},{"name":"created_at","type":"timestamp","nullable":false,"length":null,"precision":0},{"name":"updated_at","type":"timestamp","nullable":false,"length":null,"precision":0}],"jira_work_log":[{"name":"id","type":"uuid","nullable":false,"length":null,"precision":null},{"name":"task_id","type":"uuid","nullable":false,"length":null,"precision":null},{"name":"work_log_id","type":"character varying","nullable":false,"length":255,"precision":null},{"name":"description","type":"character varying","nullable":true,"length":255,"precision":null},{"name":"time_spent_seconds","type":"integer","nullable":false,"length":null,"precision":null},{"name":"start_time","type":"date","nullable":false,"length":null,"precision":null},{"name":"created_at","type":"timestamp","nullable":false,"length":null,"precision":0},{"name":"updated_at","type":"timestamp","nullable":false,"length":null,"precision":0}],"tag_task":[{"name":"tag_id","type":"uuid","nullable":false,"length":null,"precision":null},{"name":"task_id","type":"uuid","nullable":false,"length":null,"precision":null}]}'::jsonb;
  actual jsonb := '{}'::jsonb;
  records jsonb := '{}'::jsonb;
  source_table text;
  columns jsonb;
  spec jsonb;
  normalized jsonb;
  layout text;
  observed_type text;
  expression text;
  expressions text[];
  rows jsonb;
  bad boolean;
BEGIN
  FOREACH source_table IN ARRAY ARRAY['task','tag','setting','time_log','jira_work_log','tag_task'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=source_table AND c.relkind='r') THEN
      RAISE EXCEPTION 'Missing application table: %', source_table;
    END IF;
    SELECT jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable='YES','length',character_maximum_length,'precision',datetime_precision) ORDER BY ordinal_position)
      INTO columns FROM information_schema.columns WHERE table_schema='public' AND information_schema.columns.table_name=source_table;
    -- Calendar DATE precision is not meaningful in our metadata.
    SELECT jsonb_agg(CASE WHEN c->>'type'='date' THEN jsonb_set(c,'{precision}','null') ELSE c END ORDER BY ordinal)
      INTO columns FROM jsonb_array_elements(columns) WITH ORDINALITY a(c,ordinal);
    normalized := '[]';
    expressions := ARRAY[]::text[];
    FOR spec IN SELECT value FROM jsonb_array_elements(columns) LOOP
      observed_type := spec->>'type';
      IF observed_type IN ('timestamp without time zone','timestamp with time zone') THEN
        IF layout IS NULL THEN layout := CASE WHEN observed_type='timestamp without time zone' THEN 'legacy-riga' ELSE 'utc' END; END IF;
        IF observed_type <> (CASE WHEN layout='legacy-riga' THEN 'timestamp without time zone' ELSE 'timestamp with time zone' END) THEN RAISE EXCEPTION 'Mixed timestamp layouts'; END IF;
        IF (spec->>'precision')::integer <> (CASE WHEN layout='legacy-riga' THEN 0 ELSE 6 END) THEN RAISE EXCEPTION 'Unsupported timestamp precision'; END IF;
        normalized := normalized || jsonb_build_array(jsonb_set(jsonb_set(spec,'{type}','"timestamp"'),'{precision}','0'));
        expression := format('%I',spec->>'name');
        IF layout='legacy-riga' THEN expression := expression || ' AT TIME ZONE ''Europe/Riga'''; END IF;
        expression := '(extract(epoch FROM (' || expression || '))*1000)';
        EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE %s IS NOT NULL AND (NOT isfinite(%I) OR abs(%s)>8640000000000000))',source_table,format('%I',spec->>'name'),spec->>'name',expression) INTO bad;
        IF bad THEN RAISE EXCEPTION 'Unrepresentable timestamp in %.%',source_table,spec->>'name'; END IF;
        -- The previous timer writer used NOW(), which includes microseconds.
        -- Match its JavaScript date decoding: discard sub-millisecond precision,
        -- flooring epoch milliseconds even before 1970 instead of rounding bigint casts.
        expression := 'floor(' || expression || ')::bigint';
      ELSE
        normalized := normalized || jsonb_build_array(spec);
        expression := format('%I',spec->>'name');
      END IF;
      expressions := array_append(expressions,format('%s AS %I',expression,spec->>'name'));
    END LOOP;
    IF normalized <> expected->source_table THEN RAISE EXCEPTION 'Unsupported schema layout: %',source_table; END IF;
    actual := actual || jsonb_build_object(source_table,columns);
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(row)),''[]''::jsonb) FROM (SELECT %s FROM public.%I ORDER BY %s) row',array_to_string(expressions,','),source_table,CASE WHEN source_table='tag_task' THEN 'tag_id,task_id' ELSE 'id' END) INTO rows;
    records := records || jsonb_build_object(source_table,rows);
  END LOOP;
  INSERT INTO export_result VALUES (jsonb_build_object('format','jira-logger-postgres-v1','timestampLayout',layout,'schema',actual,'records',records));
END;
$export$;
SELECT snapshot::text FROM export_result;
COMMIT;
DROP TABLE export_result;
