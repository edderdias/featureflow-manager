-- Habilita a extensão 'pg_net' se ainda não estiver habilitada.
-- Isso é necessário para fazer requisições HTTP de dentro do banco de dados.
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Função para enviar notificação por e-mail via Edge Function
CREATE OR REPLACE FUNCTION public.notify_demand_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  payload JSONB;
  old_status TEXT;
  new_status TEXT;
  client_email TEXT;
BEGIN
  -- Obtém o e-mail do cliente da demanda
  client_email := NEW.client_email;

  old_status := OLD.status;
  new_status := NEW.status;

  -- Somente envia e-mail se client_email estiver presente E
  -- se o status mudou OU título/descrição/prioridade/tipo/sistema/responsável mudaram
  IF client_email IS NOT NULL AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.priority IS DISTINCT FROM NEW.priority OR
    OLD.type IS DISTINCT FROM NEW.type OR
    OLD.system IS DISTINCT FROM NEW.system OR
    OLD.responsible IS DISTINCT FROM NEW.responsible
  ) THEN
    payload := jsonb_build_object(
      'demandId', NEW.id,
      'title', NEW.title,
      'description', NEW.description,
      'oldStatus', old_status,
      'newStatus', new_status,
      'responsible', NEW.responsible,
      'clientEmail', client_email,
      'creatorName', NEW.creator_name
    );

    -- Invoca a Edge Function usando net.http_post
    -- Substitua 'mtsbmgulesknkmceidmb' pelo seu Project ID do Supabase
    PERFORM net.http_post(
      url := 'https://mtsbmgulesknkmceidmb.supabase.co/functions/v1/send-demand-update-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM pg_settings WHERE name = 'external_service.supabase_service_role_key')
      ),
      body := payload
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Cria o trigger que será acionado após cada atualização na tabela 'demands'
DROP TRIGGER IF EXISTS on_demand_update ON public.demands;
CREATE TRIGGER on_demand_update
AFTER UPDATE ON public.demands
FOR EACH ROW EXECUTE FUNCTION public.notify_demand_update();