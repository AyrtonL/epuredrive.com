-- Fix maintenance logging (car_services INSERT/UPDATE).
--
-- trg_maintenance_before() auto-mirrors a maintenance cost into a linked
-- `transactions` expense row. It had two bugs that made EVERY car_services
-- insert/update fail:
--   1. It referenced NEW.amount, but car_services has no `amount` column — the
--      cost column is `cost`. -> "record new has no field amount" (42703).
--   2. The auto-created transactions row omitted the NOT NULL `type` column.
--
-- Fix: use NEW.cost, and set type = 'expense'.
CREATE OR REPLACE FUNCTION public.trg_maintenance_before()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_desc text;
  v_category text := 'maintenance';
  v_transaction_id uuid;
BEGIN
  v_desc := 'Maintenance';
  IF NEW.service_type IS NOT NULL THEN
    v_desc := v_desc || ': ' || replace(NEW.service_type, '_', ' ');
  END IF;
  IF NEW.provider IS NOT NULL THEN
    v_desc := v_desc || ' - ' || NEW.provider;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.cost IS NOT NULL AND NEW.cost > 0 THEN
      INSERT INTO transactions (tenant_id, car_id, transaction_date, type, category, amount, description)
      VALUES (NEW.tenant_id, NEW.car_id, NEW.service_date, 'expense', v_category, NEW.cost, v_desc)
      RETURNING id INTO v_transaction_id;
      NEW.transaction_id := v_transaction_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.cost IS NOT NULL AND NEW.cost > 0 THEN
      IF OLD.transaction_id IS NULL THEN
        INSERT INTO transactions (tenant_id, car_id, transaction_date, type, category, amount, description)
        VALUES (NEW.tenant_id, NEW.car_id, NEW.service_date, 'expense', v_category, NEW.cost, v_desc)
        RETURNING id INTO v_transaction_id;
        NEW.transaction_id := v_transaction_id;
      ELSE
        UPDATE transactions
        SET amount = NEW.cost,
            transaction_date = NEW.service_date,
            description = v_desc,
            car_id = NEW.car_id
        WHERE id = OLD.transaction_id;
        NEW.transaction_id := OLD.transaction_id;
      END IF;
    ELSE
      IF OLD.transaction_id IS NOT NULL THEN
        DELETE FROM transactions WHERE id = OLD.transaction_id;
        NEW.transaction_id := NULL;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
