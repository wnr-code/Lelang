-- Penjadwal pengingat push: pg_cron memanggil route /api/cron/reminders tiap 15 menit.
-- Route memeriksa x-cron-key terhadap app_settings.cron_secret (atau env CRON_SECRET).
-- Idempoten: push_reminders mencegah kirim ganda.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Rahasia cron dibuat sekali dan disimpan di app_settings (dibaca server saat validasi).
INSERT INTO app_settings (key, value)
SELECT 'cron_secret', encode(gen_random_bytes(24), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'cron_secret');

DO $$
DECLARE
  secret text;
  cmd text;
BEGIN
  SELECT value INTO secret FROM app_settings WHERE key = 'cron_secret';
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lelang-reminders') THEN
    PERFORM cron.unschedule('lelang-reminders');
  END IF;
  cmd := format(
    $job$SELECT net.http_post(
      url := 'https://lelang.cgs.my.id/api/cron/reminders',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', %L),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    )$job$,
    secret
  );
  PERFORM cron.schedule('lelang-reminders', '*/15 * * * *', cmd);
END $$;
