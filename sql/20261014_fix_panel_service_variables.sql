CREATE OR REPLACE FUNCTION public.salao_nayara_web_v53_mutate(a text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE k text:=p->>'p_contact_key'; rid text:=p->>'request_id'; h salao_nayara_handoffs%ROWTYPE; c salao_nayara_crm_leads%ROWTYPE;
 prior salao_nayara_web_actions%ROWTYPE; result jsonb; old jsonb; hid bigint; typ text; at timestamptz; event_name text;
 v_service_key text; v_service_name text; txt text; fid bigint; target text; req text;
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
   IF EXISTS(SELECT 1 FROM salao_nayara_crm_leads l WHERE l.tenant_id='salao_nayara' AND l.contact_key<>k AND l.appointment_at=at AND l.appointment_status IN ('confirmado','confirmed','agendado')) THEN RAISE EXCEPTION 'time_already_booked'; END IF;
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
