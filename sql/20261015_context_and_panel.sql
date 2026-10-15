BEGIN;
CREATE TABLE IF NOT EXISTS public.salao_nayara_zion_assessments(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,contact_key text NOT NULL,source_role text NOT NULL,source_message_id text NOT NULL,assessment jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(contact_key,source_role,source_message_id));
CREATE INDEX IF NOT EXISTS salao_nayara_zion_assessments_contact_idx ON public.salao_nayara_zion_assessments(contact_key,id DESC);
ALTER TABLE public.salao_nayara_zion_assessments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.salao_nayara_zion_assessments FROM PUBLIC;
CREATE TABLE IF NOT EXISTS public.salao_nayara_zion_appointment_spans(contact_key text PRIMARY KEY,appointment_at timestamptz NOT NULL,duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 1 AND 720),updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.salao_nayara_zion_appointment_spans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.salao_nayara_zion_appointment_spans FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.salao_nayara_zion_check_slot(k text,at timestamptz,minutes integer) RETURNS void LANGUAGE plpgsql SET search_path=public AS $f$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('zion-salao-calendar'));
 IF EXISTS(SELECT 1 FROM salao_nayara_crm_leads l LEFT JOIN salao_nayara_zion_appointment_spans z ON z.contact_key=l.contact_key AND z.appointment_at=l.appointment_at LEFT JOIN salao_nayara_services s ON s.service_key=l.primary_service_key WHERE l.tenant_id='salao_nayara' AND l.contact_key<>k AND l.appointment_status IN ('confirmed','confirmado','agendado') AND COALESCE(z.duration_minutes,s.duration_minutes) IS NULL AND (l.appointment_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN (at AT TIME ZONE 'America/Sao_Paulo')::date AND ((at+make_interval(mins=>minutes)) AT TIME ZONE 'America/Sao_Paulo')::date) THEN RAISE EXCEPTION 'existing_duration_unknown';END IF;
 IF EXISTS(SELECT 1 FROM salao_nayara_crm_leads l LEFT JOIN salao_nayara_zion_appointment_spans z ON z.contact_key=l.contact_key AND z.appointment_at=l.appointment_at LEFT JOIN salao_nayara_services s ON s.service_key=l.primary_service_key WHERE l.tenant_id='salao_nayara' AND l.contact_key<>k AND l.appointment_status IN ('confirmed','confirmado','agendado') AND COALESCE(z.duration_minutes,s.duration_minutes)>0 AND tstzrange(l.appointment_at,l.appointment_at+make_interval(mins=>COALESCE(z.duration_minutes,s.duration_minutes)),'[)') && tstzrange(at,at+make_interval(mins=>minutes),'[)')) THEN RAISE EXCEPTION 'time_already_booked';END IF;
END;$f$;
REVOKE ALL ON FUNCTION public.salao_nayara_zion_check_slot(text,timestamptz,integer) FROM PUBLIC;
CREATE OR REPLACE FUNCTION public.salao_nayara_zion_apply_observation(k text,role text,mid text,msg text,o jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $f$
DECLARE a jsonb:=COALESCE(o->'assessment','{}');r jsonb:='{}';col text;conf numeric:=COALESCE((o->>'confidence')::numeric,0);quote text;duration integer;
BEGIN
 IF role NOT IN ('cliente','nayara') OR COALESCE(mid,'')='' OR a->>'version' IS DISTINCT FROM 'zion-context-1' THEN RETURN jsonb_build_object('applied',false,'error','context_validation_required');END IF;
 IF EXISTS(SELECT 1 FROM salao_nayara_zion_assessments x WHERE x.contact_key=k AND x.source_role=role AND x.source_message_id=mid) THEN RETURN jsonb_build_object('applied',false,'replayed',true);END IF;
 FOREACH col IN ARRAY ARRAY['quoted_price_cents','charged_price_cents','paid_price_cents','discount_cents','payment_claimed_cents'] LOOP
  quote:=o#>>ARRAY['evidence',col];
  IF role='cliente' AND col<>'payment_claimed_cents' OR a->>'money_context' IS DISTINCT FROM 'salon_service' OR conf<0.9 OR COALESCE(o#>>'{evidence,service_link_clear}','false')<>'true' OR COALESCE(quote,'')='' OR strpos(msg,quote)=0 OR NOT EXISTS(SELECT 1 FROM salao_nayara_services s WHERE s.service_key=a->>'service_key' AND s.active) THEN o:=jsonb_set(o,ARRAY[col],'null');END IF;
 END LOOP;
 IF role='cliente' THEN
  o:=o||jsonb_build_object('financial_type','none','service_completed',false);
  IF o->>'appointment_status' NOT IN ('none','requested') THEN o:=o||jsonb_build_object('appointment_status','none','appointment_at','');END IF;
 END IF;
 IF o->>'appointment_status'='confirmed' THEN
  SELECT s.duration_minutes INTO duration FROM salao_nayara_services s WHERE s.service_key=o->>'service_key';
  BEGIN
   IF duration IS NULL OR NULLIF(o->>'appointment_at','') IS NULL THEN RAISE EXCEPTION 'duration_required';END IF;
   PERFORM salao_nayara_zion_check_slot(k,(o->>'appointment_at')::timestamptz,duration);
   INSERT INTO salao_nayara_zion_appointment_spans(contact_key,appointment_at,duration_minutes) VALUES(k,(o->>'appointment_at')::timestamptz,duration) ON CONFLICT(contact_key) DO UPDATE SET appointment_at=EXCLUDED.appointment_at,duration_minutes=EXCLUDED.duration_minutes,updated_at=now();
  EXCEPTION WHEN OTHERS THEN
   o:=o||jsonb_build_object('appointment_status','requested');a:=a||jsonb_build_object('needs_review',true,'review_reason','Confirme duração e disponibilidade na agenda antes de registrar o horário.');
  END;
 END IF;
 IF a->>'service_intent' IN ('declined','cancelled','mentioned','none') AND COALESCE(o->>'quoted_price_cents',o->>'charged_price_cents',o->>'paid_price_cents',o->>'discount_cents',o->>'payment_claimed_cents') IS NULL THEN o:=o||jsonb_build_object('service_key','','service_name','','customer_confirmed',false);END IF;
 IF COALESCE((o->>'has_fact')::boolean,false) AND conf>=0.75 THEN r:=salao_nayara_v51_8_apply_observation(k,role,mid,msg,o);END IF;
 a:=a||jsonb_build_object('amount_cents',COALESCE(o->'paid_price_cents', 'null'),'validation_version','zion-context-1');
 -- JSON nulls do not coalesce: choose the actual validated event explicitly.
 a:=a||jsonb_build_object('amount_cents',COALESCE(NULLIF(o->>'paid_price_cents','')::integer,NULLIF(o->>'charged_price_cents','')::integer,NULLIF(o->>'quoted_price_cents','')::integer,NULLIF(o->>'discount_cents','')::integer,NULLIF(o->>'payment_claimed_cents','')::integer));
 INSERT INTO salao_nayara_zion_assessments(contact_key,source_role,source_message_id,assessment) VALUES(k,role,mid,a);
 RETURN r||jsonb_build_object('context_saved',true);
END;$f$;
REVOKE ALL ON FUNCTION public.salao_nayara_zion_apply_observation(text,text,text,text,jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.salao_nayara_web_v53_read(a text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE k text:=p->>'p_contact_key'; result jsonb; rows jsonb; total bigint; lim integer:=LEAST(100,GREATEST(1,COALESCE((p->>'p_limit')::integer,50))); offst integer:=GREATEST(0,COALESCE((p->>'p_offset')::integer,0)); search text:=btrim(COALESCE(p->>'p_search','')); note jsonb; control jsonb;
BEGIN
 IF a='catalog' THEN
 RETURN jsonb_build_object('services',COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.service_name) FROM salao_nayara_services s WHERE active),'[]'));
 ELSIF a='dashboard' THEN
 SELECT setting_value INTO k FROM salao_nayara_settings WHERE setting_key='web_access_key';
 result:=salao_nayara_web_api(k,'dashboard',p)->'data';
 IF result IS NULL THEN RAISE EXCEPTION 'dashboard_unavailable'; END IF;
 result:=result||jsonb_build_object('finance_summary',salao_nayara_web_finance('today')->'summary');
 result:=jsonb_set(result,'{metrics,appointments_today}',to_jsonb((SELECT count(*) FROM salao_nayara_crm_leads l WHERE l.tenant_id='salao_nayara' AND (l.appointment_at AT TIME ZONE 'America/Sao_Paulo')::date=(now() AT TIME ZONE 'America/Sao_Paulo')::date AND l.appointment_status IN ('confirmed','confirmado','agendado','realizado','completed'))));
 result:=jsonb_set(result,'{funnel,service_interest}',to_jsonb((SELECT count(*) FROM (SELECT DISTINCT ON(contact_key) contact_key,assessment FROM salao_nayara_zion_assessments WHERE created_at>=(date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo') AND assessment->>'service_intent'<>'none' ORDER BY contact_key,id DESC)x WHERE assessment->>'service_intent' IN ('interested','accepted'))));
 result:=jsonb_set(result,'{funnel,service_inquiries}',to_jsonb((SELECT count(*) FROM (SELECT DISTINCT ON(contact_key) contact_key,assessment FROM salao_nayara_zion_assessments WHERE created_at>=(date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo') AND assessment->>'service_intent'<>'none' ORDER BY contact_key,id DESC)x WHERE assessment->>'service_intent'='inquiring')));
 RETURN result;
 ELSIF a='conversation' THEN
  result:=salao_nayara_web_conversation(k);
  SELECT COUNT(*) INTO total FROM salao_nayara_web_v53_timeline WHERE contact_key=k;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY created_at,id),'[]') INTO rows FROM (
   SELECT id,content,created_at,author,role,media_type,sender_name,delivery_status,
    metadata-'web_media'-'audio_base64'-'image_base64' metadata,
    CASE WHEN media_type IN ('image','audio','video','document','sticker','imagemessage','audiomessage') THEN true ELSE false END has_media
   FROM salao_nayara_web_v53_timeline WHERE contact_key=k ORDER BY created_at DESC,id DESC LIMIT lim OFFSET offst
  ) x;
  SELECT to_jsonb(n) INTO note FROM salao_nayara_web_client_notes n WHERE contact_key=k;
  control:=salao_nayara_web_v53_control(k);
  RETURN result||jsonb_build_object('messages',rows,'total_messages',total,'control',control,'note',COALESCE(note,'{}'),
   'history',COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY created_at DESC) FROM (SELECT wa.request_id,wa.action,wa.actor,wa.created_at,wa.result-'text' result FROM salao_nayara_web_actions wa WHERE wa.contact_key=k ORDER BY wa.created_at DESC LIMIT 40)x),'[]'),
   'assessments',COALESCE((SELECT jsonb_agg(to_jsonb(z) ORDER BY z.id DESC) FROM (SELECT id,assessment,source_role,created_at FROM salao_nayara_zion_assessments WHERE contact_key=k ORDER BY id DESC LIMIT 10)z),'[]'),
   'appointment_span',(SELECT to_jsonb(s) FROM salao_nayara_zion_appointment_spans s WHERE s.contact_key=k),
   'services',COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM (SELECT service_key,service_name,price_cents,price_type,duration_minutes FROM salao_nayara_services WHERE active ORDER BY service_name)s),'[]'),
   'recent_services',COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY event_at DESC) FROM (SELECT event_type,event_at,service_name,payload FROM salao_nayara_crm_events WHERE tenant_id='salao_nayara' AND contact_key=k AND event_type IN ('agendamento_confirmado','atendimento_realizado','faltou','cancelado') ORDER BY event_at DESC LIMIT 30)s),'[]'),
   'deliveries',COALESCE((SELECT jsonb_agg(to_jsonb(z) ORDER BY created_at DESC) FROM (
    SELECT 'web' target,request_id id,content,delivery_status,created_at,created_at<now()-interval '2 minutes' review_allowed FROM salao_nayara_web_outbox WHERE contact_key=k AND delivery_status IN ('pending','unknown','failed')
    UNION ALL SELECT 'bot',id::text,content,delivery_status,sent_at,sent_at<now()-interval '12 minutes' FROM salao_nayara_wa_bot_outbox WHERE tenant_id='salao_nayara' AND contact_key=k AND delivery_status IN ('pending','unknown')
   )z),'[]'));
 ELSIF a='conversations' THEN
  WITH last_msg AS(SELECT DISTINCT ON(contact_key) * FROM salao_nayara_web_v53_timeline ORDER BY contact_key,created_at DESC,id DESC)
  SELECT COUNT(*) INTO total FROM last_msg m LEFT JOIN salao_nayara_crm_leads l ON l.contact_key=m.contact_key AND l.tenant_id='salao_nayara' WHERE search='' OR COALESCE(l.customer_name,'') ILIKE '%'||search||'%' OR m.contact_key ILIKE '%'||search||'%' OR m.content ILIKE '%'||search||'%';
  WITH last_msg AS(SELECT DISTINCT ON(contact_key) * FROM salao_nayara_web_v53_timeline ORDER BY contact_key,created_at DESC,id DESC)
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY last_message_at DESC,contact_key),'[]') INTO rows FROM (
   SELECT m.contact_key,COALESCE(NULLIF(l.customer_name,''),m.contact_key) customer_name,m.created_at last_message_at,m.content last_message,m.author,
    salao_nayara_web_v53_control(m.contact_key)->>'responsible' responsible
   FROM last_msg m LEFT JOIN salao_nayara_crm_leads l ON l.contact_key=m.contact_key AND l.tenant_id='salao_nayara'
   WHERE search='' OR COALESCE(l.customer_name,'') ILIKE '%'||search||'%' OR m.contact_key ILIKE '%'||search||'%' OR m.content ILIKE '%'||search||'%'
   ORDER BY m.created_at DESC,m.contact_key LIMIT lim OFFSET offst
  ) x; RETURN jsonb_build_object('rows',rows,'total',total);
 ELSIF a='pending' THEN
  SELECT COUNT(*) INTO total FROM salao_nayara_handoffs WHERE tenant_id='salao_nayara' AND status IN ('aguardando_nayara','em_atendimento') AND COALESCE(metadata->>'web_hidden','false')<>'true' AND (COALESCE(p->>'p_filter','') IN ('','all') OR CASE WHEN reason~*'reclam|urgenc' THEN 'complaint' WHEN reason~*'agend' THEN 'schedule' WHEN reason~*'aval|imagem|foto' THEN 'evaluation' WHEN reason~*'valor|orcamento|preco' THEN 'price' ELSE 'reply' END=p->>'p_filter');
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY priority_order,created_at),'[]') INTO rows FROM (
   SELECT h.*,COALESCE(NULLIF(l.customer_name,''),NULLIF(h.customer_name,''),h.contact_key) display_name,COALESCE(l.primary_service_name,h.metadata->'collected'->>'servico') service_name,
    CASE WHEN h.priority='alta' THEN 0 ELSE 1 END priority_order,
    CASE WHEN h.reason~*'reclam|urgenc' THEN 'Responder com prioridade' WHEN h.reason~*'agend' THEN 'Confirmar horário' WHEN h.reason~*'aval|imagem|foto' THEN 'Avaliar foto e orientar' WHEN h.reason~*'valor|orcamento|preco' THEN 'Definir orçamento' WHEN h.reason='falha_envio' THEN CASE WHEN h.contact_key LIKE 'instagram:%' THEN 'Conferir conversa no Instagram' ELSE 'Conferir entrega no WhatsApp' END ELSE 'Responder à cliente' END action_required,
    (SELECT m.content FROM salao_nayara_messages m WHERE m.tenant_id='salao_nayara' AND m.contact_key=h.contact_key AND m.message_origin IN ('user','user_silenced','user_flushed_by_human') ORDER BY created_at DESC LIMIT 1) last_customer_message
   FROM salao_nayara_handoffs h LEFT JOIN salao_nayara_crm_leads l ON l.tenant_id='salao_nayara' AND l.contact_key=h.contact_key
   WHERE h.tenant_id='salao_nayara' AND h.status IN ('aguardando_nayara','em_atendimento') AND COALESCE(h.metadata->>'web_hidden','false')<>'true' AND (COALESCE(p->>'p_filter','') IN ('','all') OR CASE WHEN h.reason~*'reclam|urgenc' THEN 'complaint' WHEN h.reason~*'agend' THEN 'schedule' WHEN h.reason~*'aval|imagem|foto' THEN 'evaluation' WHEN h.reason~*'valor|orcamento|preco' THEN 'price' ELSE 'reply' END=p->>'p_filter')
   ORDER BY priority_order,h.created_at LIMIT lim OFFSET offst
  )x; RETURN jsonb_build_object('rows',rows,'total',total);
 ELSIF a='clients' THEN
  SELECT COUNT(*) INTO total FROM salao_nayara_crm_leads WHERE tenant_id='salao_nayara' AND (search='' OR customer_name ILIKE '%'||search||'%' OR contact_key ILIKE '%'||search||'%');
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY last_activity_at DESC NULLS LAST,contact_key),'[]') INTO rows FROM (
   SELECT contact_key,customer_name,contact_id,primary_service_name,last_service_name,last_activity_at,lifetime_paid_cents,relationship_status,attention_priority FROM salao_nayara_crm_leads
   WHERE tenant_id='salao_nayara' AND (search='' OR customer_name ILIKE '%'||search||'%' OR contact_key ILIKE '%'||search||'%') ORDER BY last_activity_at DESC NULLS LAST,contact_key LIMIT lim OFFSET offst)x;
  RETURN jsonb_build_object('rows',rows,'total',total);
 ELSIF a='finance' THEN
  result:=salao_nayara_web_finance(COALESCE(p->>'p_scope','today'));
  SELECT count(*) INTO total FROM salao_nayara_crm_financial f WHERE f.tenant_id='salao_nayara' AND f.record_status='active' AND f.amount_cents>0 AND f.event_at>=(result->>'start_at')::timestamptz AND f.event_at<(result->>'end_at')::timestamptz;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY event_at DESC,id DESC),'[]') INTO rows FROM (
   SELECT f.id,f.contact_key,COALESCE(l.customer_name,l.contact_id,f.contact_key) customer_name,f.financial_type,f.amount_cents,f.payment_method,f.service_name,f.event_at,f.source_role,f.metadata FROM salao_nayara_crm_financial f LEFT JOIN salao_nayara_crm_leads l ON l.tenant_id=f.tenant_id AND l.contact_key=f.contact_key
   WHERE f.tenant_id='salao_nayara' AND f.record_status='active' AND f.amount_cents>0 AND f.event_at>=(result->>'start_at')::timestamptz AND f.event_at<(result->>'end_at')::timestamptz ORDER BY f.event_at DESC,f.id DESC LIMIT lim OFFSET offst
  )x; RETURN result||jsonb_build_object('rows',rows,'total',total);
 ELSIF a='media' THEN
  SELECT metadata->'web_media' INTO result FROM salao_nayara_messages WHERE tenant_id='salao_nayara' AND contact_key=k AND id=replace(p->>'message_id','m:','')::bigint;
  IF result IS NOT NULL AND NULLIF(result->>'base64','') IS NOT NULL THEN RETURN jsonb_build_object('available',true,'base64',result->>'base64','mime',result->>'mime'); END IF;
  SELECT jsonb_build_object('provider_message_id',provider_message_id,'contact_key',contact_key,'media_type',media_type,'web_media',metadata->'web_media') INTO result FROM salao_nayara_messages WHERE tenant_id='salao_nayara' AND contact_key=k AND id=replace(p->>'message_id','m:','')::bigint;
  RETURN jsonb_build_object('available',false,'fetch_media',NULLIF(result->>'provider_message_id','') IS NOT NULL)||COALESCE(result,'{}');
 END IF;
 RAISE EXCEPTION 'unknown_read_action';
END; $function$
;

CREATE OR REPLACE FUNCTION public.salao_nayara_web_v53_mutate(a text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE k text:=p->>'p_contact_key'; rid text:=p->>'request_id'; h salao_nayara_handoffs%ROWTYPE; c salao_nayara_crm_leads%ROWTYPE;
 prior salao_nayara_web_actions%ROWTYPE; result jsonb; old jsonb; hid bigint; typ text; at timestamptz; event_name text;
 v_service_key text; v_service_name text; txt text; fid bigint; target text; req text; minutes integer; oldf salao_nayara_crm_financial%ROWTYPE; newfid bigint;
BEGIN
 IF rid IS NULL OR rid!~'^[a-zA-Z0-9_-]{16,100}$' THEN RAISE EXCEPTION 'request_id_required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('web-action|'||rid));
 SELECT * INTO prior FROM salao_nayara_web_actions WHERE request_id=rid;
 IF FOUND THEN
  IF prior.params_hash<>md5(p::text) OR prior.action<>a THEN RAISE EXCEPTION 'request_id_conflict'; END IF;
  RETURN prior.result||jsonb_build_object('replayed',true,'send_allowed',false);
 END IF;
 IF a IN ('resolve_handoff','ignore_handoff','reopen_handoff') THEN
  SELECT * INTO h FROM salao_nayara_handoffs WHERE tenant_id='salao_nayara' AND id=(p->>'p_handoff_id')::bigint FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'handoff_not_found'; END IF;
  IF k IS NOT NULL AND k<>h.contact_key THEN RAISE EXCEPTION 'contact_mismatch'; END IF; k:=h.contact_key;
 END IF;
 IF k IS NULL OR k!~'^(whatsapp:[0-9]{8,24}|instagram:[a-zA-Z0-9_.-]{5,80})$' THEN RAISE EXCEPTION 'invalid_contact'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('v52-event|'||k));
 SELECT * INTO c FROM salao_nayara_crm_leads WHERE tenant_id='salao_nayara' AND contact_key=k FOR UPDATE;
 IF NOT FOUND THEN
  IF NOT EXISTS(SELECT 1 FROM salao_nayara_messages WHERE tenant_id='salao_nayara' AND contact_key=k) THEN RAISE EXCEPTION 'contact_not_found'; END IF;
  INSERT INTO salao_nayara_crm_leads(tenant_id,contact_key,channel,contact_id) VALUES('salao_nayara',k,split_part(k,':',1),split_part(k,':',2)) RETURNING * INTO c;
 END IF;
 result:=jsonb_build_object('success',true,'contact_key',k,'request_id',rid);
 IF a='takeover' THEN
  PERFORM salao_nayara_web_v53_takeover(k);
 ELSIF a='release' THEN
  IF EXISTS(SELECT 1 FROM salao_nayara_web_outbox WHERE contact_key=k AND delivery_status IN ('pending','unknown')) OR EXISTS(SELECT 1 FROM salao_nayara_wa_bot_outbox WHERE tenant_id='salao_nayara' AND contact_key=k AND delivery_status IN ('pending','unknown')) THEN RAISE EXCEPTION 'review_delivery_first'; END IF;
  UPDATE salao_nayara_contact_runtime SET human_control=false,human_control_since=NULL,human_control_by=NULL,human_control_reason=NULL,silent_until=now()-interval '1 second',silence_reason='human_released_bot',bot_resumed_at=now(),updated_at=now() WHERE contact_key=k;
  UPDATE salao_nayara_wa_silence SET silent_until=now()-interval '1 second',silence_reason='human_released_bot',updated_at=now() WHERE chat_id=k;
 ELSIF a IN ('resolve_handoff','ignore_handoff','reopen_handoff') THEN
  old:=to_jsonb(h);
  IF a='reopen_handoff' THEN
   IF h.status NOT IN ('resolvido','ignorado') THEN RAISE EXCEPTION 'handoff_cannot_reopen'; END IF;
   IF EXISTS(SELECT 1 FROM salao_nayara_handoffs WHERE tenant_id='salao_nayara' AND contact_key=k AND status IN ('aguardando_nayara','em_atendimento')) THEN RAISE EXCEPTION 'another_handoff_open'; END IF;
   UPDATE salao_nayara_handoffs SET status='aguardando_nayara',closed_at=NULL,metadata=metadata||jsonb_build_object('web_hidden',false,'reopened_at',now()) WHERE id=h.id;
  ELSE
   IF h.status NOT IN ('aguardando_nayara','em_atendimento') THEN RAISE EXCEPTION 'handoff_not_open'; END IF;
   UPDATE salao_nayara_handoffs SET status=CASE WHEN a='resolve_handoff' THEN 'resolvido' ELSE 'ignorado' END,closed_at=now(),metadata=metadata||jsonb_build_object('resolved_via','web_v53','resolved_at',now(),'web_hidden',a='ignore_handoff','ignored_reason',left(COALESCE(p->>'p_reason',''),500)) WHERE id=h.id;
   UPDATE salao_nayara_messages SET processed=true,metadata=metadata||jsonb_build_object('status','concluido','closed_via','web_v53'),updated_at=now() WHERE tenant_id='salao_nayara' AND contact_key=k AND message_origin IN ('handoff_queue','handoff_started') AND (metadata->>'handoff_id'=h.id::text OR metadata->>'handoff_id' IS NULL) AND created_at<=now();
  END IF;
  UPDATE salao_nayara_crm_leads SET handoff_open=EXISTS(SELECT 1 FROM salao_nayara_handoffs WHERE tenant_id='salao_nayara' AND contact_key=k AND status IN ('aguardando_nayara','em_atendimento')),updated_at=now() WHERE tenant_id='salao_nayara' AND contact_key=k;
  result:=result||jsonb_build_object('handoff_id',h.id,'previous_status',h.status);
 ELSIF a='save_note' THEN
  txt:=btrim(COALESCE(p->>'notes','')); IF length(txt)>5000 THEN RAISE EXCEPTION 'note_too_long'; END IF;
  SELECT to_jsonb(n) INTO old FROM salao_nayara_web_client_notes n WHERE contact_key=k;
  IF COALESCE(p->>'expected_updated_at','')<>COALESCE(old->>'updated_at','') THEN RAISE EXCEPTION 'record_changed'; END IF;
  INSERT INTO salao_nayara_web_client_notes(contact_key,notes) VALUES(k,txt) ON CONFLICT(contact_key) DO UPDATE SET notes=EXCLUDED.notes,updated_at=now();
 ELSIF a='send_message' THEN
  IF k!~'^whatsapp:[0-9]{8,24}$' THEN RAISE EXCEPTION 'whatsapp_only'; END IF;
  txt:=btrim(COALESCE(p->>'text','')); IF length(txt)<1 OR length(txt)>3500 THEN RAISE EXCEPTION 'invalid_message_length'; END IF;
  IF EXISTS(SELECT 1 FROM salao_nayara_web_outbox WHERE contact_key=k AND delivery_status IN ('pending','unknown')) OR EXISTS(SELECT 1 FROM salao_nayara_wa_bot_outbox WHERE tenant_id='salao_nayara' AND contact_key=k AND delivery_status IN ('pending','unknown')) THEN RAISE EXCEPTION 'review_delivery_first'; END IF;
  PERFORM salao_nayara_web_v53_takeover(k);
  IF txt!~'^\*Nayara\*\s' THEN txt:='*Nayara*'||E'\n'||txt; END IF;
  INSERT INTO salao_nayara_web_outbox(request_id,contact_key,content) VALUES(rid,k,txt);
  result:=result||jsonb_build_object('send_allowed',true,'text',txt,'send_jid',split_part(k,':',2)||'@s.whatsapp.net','delivery_status','pending');
 ELSIF a='reconcile_message' THEN
  target:=p->>'target'; req:=p->>'message_id'; typ:=p->>'outcome';
  IF typ NOT IN ('sent','not_sent') OR length(btrim(COALESCE(p->>'notes','')))<5 THEN RAISE EXCEPTION 'delivery_review_required'; END IF;
  IF target='web' THEN
   UPDATE salao_nayara_web_outbox SET delivery_status=typ,last_error='Conferido no WhatsApp por Nayara: '||left(p->>'notes',500),updated_at=now() WHERE request_id=req AND contact_key=k AND (delivery_status='unknown' OR (delivery_status='pending' AND created_at<now()-interval '2 minutes'));
  ELSIF target='bot' THEN
   UPDATE salao_nayara_wa_bot_outbox SET delivery_status=typ,last_error='Conferido no WhatsApp por Nayara: '||left(p->>'notes',500),updated_at=now() WHERE id=req::bigint AND tenant_id='salao_nayara' AND contact_key=k AND (delivery_status='unknown' OR (delivery_status='pending' AND sent_at<now()-interval '12 minutes'));
  ELSE RAISE EXCEPTION 'invalid_delivery_target'; END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'delivery_still_running_or_already_reviewed'; END IF;
 ELSIF a='appointment' THEN
  typ:=p->>'operation'; old:=jsonb_build_object('appointment_at',c.appointment_at,'appointment_status',c.appointment_status);
  IF (p->>'expected_appointment_at')::timestamptz IS DISTINCT FROM c.appointment_at OR COALESCE(p->>'expected_status','')<>COALESCE(c.appointment_status,'') THEN RAISE EXCEPTION 'record_changed'; END IF;
  v_service_key:=NULLIF(btrim(p->>'service_key'),''); v_service_name:=NULLIF(btrim(p->>'service_name'),'');
  IF v_service_key IS NOT NULL THEN SELECT s.service_name INTO v_service_name FROM salao_nayara_services s WHERE s.service_key=v_service_key AND active; IF NOT FOUND THEN RAISE EXCEPTION 'invalid_service'; END IF; END IF;
  IF v_service_name IS NULL THEN v_service_key:=c.primary_service_key;v_service_name:=c.primary_service_name;
  ELSIF v_service_key IS NULL AND v_service_name=c.primary_service_name THEN v_service_key:=c.primary_service_key; END IF;
  IF typ IN ('confirm','reschedule') THEN
   IF typ='reschedule' AND (c.appointment_at IS NULL OR c.appointment_status NOT IN ('confirmado','confirmed','agendado')) THEN RAISE EXCEPTION 'appointment_not_active'; END IF;
   at:=NULLIF(p->>'appointment_at','')::timestamptz; IF at IS NULL OR at<now() THEN RAISE EXCEPTION 'future_appointment_required'; END IF;
   IF v_service_name IS NULL THEN RAISE EXCEPTION 'service_required'; END IF;
   PERFORM pg_advisory_xact_lock(hashtext('web-v53-agenda'));
   minutes:=COALESCE(NULLIF(p->>'duration_minutes','')::integer,(SELECT s.duration_minutes FROM salao_nayara_services s WHERE s.service_key=v_service_key));
   IF minutes IS NULL OR minutes<1 OR minutes>720 THEN RAISE EXCEPTION 'duration_required'; END IF;
   PERFORM pg_advisory_xact_lock(hashtext('zion-salao-calendar'));
   PERFORM public.salao_nayara_zion_check_slot(k,at,minutes);
   INSERT INTO salao_nayara_zion_appointment_spans(contact_key,appointment_at,duration_minutes,updated_at) VALUES(k,at,minutes,now()) ON CONFLICT(contact_key) DO UPDATE SET appointment_at=EXCLUDED.appointment_at,duration_minutes=EXCLUDED.duration_minutes,updated_at=now();
   event_name:='agendamento_confirmado';
  ELSE
   IF c.appointment_at IS NULL OR c.appointment_status NOT IN ('confirmado','confirmed','agendado') THEN RAISE EXCEPTION 'appointment_not_active'; END IF;
   event_name:=CASE typ WHEN 'complete' THEN 'atendimento_realizado' WHEN 'cancel' THEN 'cancelado' WHEN 'no_show' THEN 'faltou' END;
   IF event_name IS NULL THEN RAISE EXCEPTION 'invalid_appointment_action'; END IF;
   IF typ IN ('complete','no_show') AND c.appointment_at>now() THEN RAISE EXCEPTION 'appointment_not_started'; END IF;
   at:=now();
  END IF;
  -- A scheduling event must not silently close an unrelated complaint or valuation.
  SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]') INTO result FROM salao_nayara_handoffs x WHERE tenant_id='salao_nayara' AND contact_key=k AND status IN ('aguardando_nayara','em_atendimento');
  PERFORM salao_nayara_v51_register_event(k,event_name,v_service_key,v_service_name,at,left(COALESCE(p->>'notes',''),1000),'web-v53|'||rid);
  UPDATE salao_nayara_handoffs x SET status=j->>'status',closed_at=(j->>'closed_at')::timestamptz,metadata=(j->'metadata') FROM jsonb_array_elements(result) j WHERE x.id=(j->>'id')::bigint;
  UPDATE salao_nayara_crm_leads SET primary_service_key=v_service_key,primary_service_name=v_service_name,handoff_open=(jsonb_array_length(result)>0),appointment_confirmed_by='Nayara',last_activity_at=now(),updated_at=now() WHERE tenant_id='salao_nayara' AND contact_key=k;
  UPDATE salao_nayara_crm_events SET payload=payload||jsonb_build_object('web_operation',typ,'appointment_before',old,'appointment_at',COALESCE((p->>'appointment_at')::timestamptz,c.appointment_at),'actor','Nayara') WHERE tenant_id='salao_nayara' AND idempotency_key='web-v53|'||rid;
  result:=jsonb_build_object('success',true,'contact_key',k,'request_id',rid,'event_type',event_name);
 ELSIF a='correct_financial' THEN
  SELECT * INTO oldf FROM salao_nayara_crm_financial f WHERE f.id=(p->>'financial_id')::bigint AND f.contact_key=k AND f.tenant_id='salao_nayara' FOR UPDATE;
  IF NOT FOUND OR oldf.record_status<>'active' OR oldf.amount_cents IS DISTINCT FROM (p->>'expected_amount_cents')::integer THEN RAISE EXCEPTION 'record_changed'; END IF;
  txt:=btrim(COALESCE(p->>'reason',''));IF length(txt)<5 OR length(txt)>1000 THEN RAISE EXCEPTION 'correction_reason_required';END IF;
  typ:=p->>'operation';IF typ NOT IN ('replace','invalidate') THEN RAISE EXCEPTION 'invalid_correction';END IF;
  old:=to_jsonb(oldf);
  IF typ='replace' THEN
   IF COALESCE((p->>'amount_cents')::integer,0)<=0 THEN RAISE EXCEPTION 'invalid_amount';END IF;
   INSERT INTO salao_nayara_crm_financial(tenant_id,contact_key,financial_type,amount_cents,payment_method,service_key,service_name,event_at,source_role,source_message_id,notes,metadata,source_type,confidence,evidence,record_status,correction_reason)
    VALUES(oldf.tenant_id,k,oldf.financial_type,(p->>'amount_cents')::integer,oldf.payment_method,oldf.service_key,oldf.service_name,oldf.event_at,'nayara','web-v53|'||rid,txt,jsonb_build_object('corrected_record_id',oldf.id,'recorded_via','web_v53'),'owner_manual',1,jsonb_build_object('correction_of',oldf.id),'active',txt) RETURNING id INTO newfid;
  END IF;
  UPDATE salao_nayara_crm_financial SET record_status='superseded',superseded_at=now(),superseded_by_id=newfid,correction_reason=txt WHERE id=oldf.id;
  UPDATE salao_nayara_crm_facts SET status='superseded' WHERE tenant_id='salao_nayara' AND contact_key=k AND fact_type='financial_'||oldf.financial_type AND (fact_value->>'financial_id'=oldf.id::text OR (oldf.source_message_id IS NOT NULL AND source_message_id=oldf.source_message_id));
  PERFORM salao_nayara_v51_8_recompute_financial(k);
  result:=jsonb_build_object('success',true,'financial_id',oldf.id,'replacement_id',newfid,'request_id',rid);
 ELSIF a='financial' THEN
  typ:=p->>'financial_type'; IF typ NOT IN ('paid','charged','quote','discount','refund') THEN RAISE EXCEPTION 'invalid_financial_type'; END IF;
  IF COALESCE((p->>'amount_cents')::integer,0)<=0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  at:=COALESCE(NULLIF(p->>'event_at','')::timestamptz,now()); IF at>now()+interval '5 minutes' THEN RAISE EXCEPTION 'future_financial_event'; END IF;
  result:=salao_nayara_v51_register_financial(k,typ,(p->>'amount_cents')::integer,NULLIF(p->>'payment_method',''),NULLIF(p->>'service_key',''),NULLIF(p->>'service_name',''),at,'nayara','web-v53|'||rid,left(p->>'notes',1000));
  IF COALESCE((result->>'applied')::boolean,false)=false THEN RAISE EXCEPTION 'financial_not_applied'; END IF;
  UPDATE salao_nayara_crm_financial SET metadata=metadata||jsonb_build_object('appointment_at',NULLIF(p->>'appointment_at','')::timestamptz,'recorded_via','web_v53'),source_type='owner_manual',confidence=1 WHERE tenant_id='salao_nayara' AND contact_key=k AND source_role='nayara' AND source_message_id='web-v53|'||rid RETURNING id INTO fid;
  result:=result||jsonb_build_object('success',true,'financial_id',fid,'request_id',rid);
 ELSE RAISE EXCEPTION 'unknown_action'; END IF;
 INSERT INTO salao_nayara_web_actions(request_id,contact_key,action,params_hash,result) VALUES(rid,k,a,md5(p::text),result||jsonb_build_object('previous',old));
 RETURN result;
END; $function$
;

CREATE OR REPLACE FUNCTION public.salao_nayara_web_v53_api(p_access_key text, p_action text, p_params jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE result jsonb; a text:=lower(btrim(p_action)); expected text; latest bigint; earliest bigint; since bigint;
BEGIN
 SELECT setting_value INTO expected FROM salao_nayara_settings WHERE setting_key='web_access_key';
 IF NULLIF(expected,'') IS NULL OR p_access_key IS DISTINCT FROM expected THEN RETURN jsonb_build_object('ok',false,'error','unauthorized'); END IF;
 IF a='ping' THEN RETURN jsonb_build_object('ok',true,'version','53.0','latest_event_id',COALESCE((SELECT max(id) FROM salao_nayara_web_events),0),'capabilities',jsonb_build_array('takeover','release','send_message','appointment','financial','save_note','reopen_handoff','media'),'server_time',now());
 ELSIF a='sync' THEN
  since:=GREATEST(0,COALESCE((p_params->>'since_event_id')::bigint,0));SELECT COALESCE(max(id),0),COALESCE(min(id),0) INTO latest,earliest FROM salao_nayara_web_events;
  RETURN jsonb_build_object('ok',true,'latest_event_id',latest,'reset_required',since>latest OR (since>0 AND since<earliest-1),'changed_sources',COALESCE((SELECT jsonb_agg(source_table) FROM (SELECT DISTINCT source_table FROM salao_nayara_web_events WHERE id>since)x),'[]'),'server_time',now());
 ELSIF a IN ('takeover','release','resolve_handoff','ignore_handoff','reopen_handoff','send_message','reconcile_message','appointment','financial','save_note','correct_financial') THEN result:=salao_nayara_web_v53_mutate(a,p_params);
 ELSIF a IN ('conversation','conversations','pending','clients','finance','media','catalog','dashboard') THEN result:=salao_nayara_web_v53_read(a,p_params);
 ELSE RETURN salao_nayara_web_api(p_access_key,a,p_params); END IF;
 RETURN jsonb_build_object('ok',true,'data',result);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'error',SQLERRM); END; $function$
;

SELECT jsonb_build_object('ok',true,'migration','zion-context-1') AS result;
COMMIT;
