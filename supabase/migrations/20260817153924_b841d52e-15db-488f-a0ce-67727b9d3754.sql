select cron.unschedule(jobname) from cron.job where jobname like 'myra-launch-%';

select cron.schedule('myra-launch-1', '30 3 * * *', $$
  SELECT net.http_post(
    url:='https://tzvttqrxfxhqtidlvdlu.supabase.co/functions/v1/zara-scheduled',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dnR0cXJ4ZnhocXRpZGx2ZGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDQ1MTQsImV4cCI6MjA4NjMyMDUxNH0.m-Nh8NlHsIjRsLY7wvgJq2YoTlBKo43Kv-LYBuSsR7o"}'::jsonb,
    body:='{"type": "launch"}'::jsonb
  );
$$);
select cron.schedule('myra-launch-2', '30 5 * * *', $$
  SELECT net.http_post(
    url:='https://tzvttqrxfxhqtidlvdlu.supabase.co/functions/v1/zara-scheduled',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dnR0cXJ4ZnhocXRpZGx2ZGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDQ1MTQsImV4cCI6MjA4NjMyMDUxNH0.m-Nh8NlHsIjRsLY7wvgJq2YoTlBKo43Kv-LYBuSsR7o"}'::jsonb,
    body:='{"type": "launch"}'::jsonb
  );
$$);
select cron.schedule('myra-launch-3', '30 8 * * *', $$
  SELECT net.http_post(
    url:='https://tzvttqrxfxhqtidlvdlu.supabase.co/functions/v1/zara-scheduled',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dnR0cXJ4ZnhocXRpZGx2ZGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDQ1MTQsImV4cCI6MjA4NjMyMDUxNH0.m-Nh8NlHsIjRsLY7wvgJq2YoTlBKo43Kv-LYBuSsR7o"}'::jsonb,
    body:='{"type": "launch"}'::jsonb
  );
$$);
select cron.schedule('myra-launch-4', '30 11 * * *', $$
  SELECT net.http_post(
    url:='https://tzvttqrxfxhqtidlvdlu.supabase.co/functions/v1/zara-scheduled',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dnR0cXJ4ZnhocXRpZGx2ZGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDQ1MTQsImV4cCI6MjA4NjMyMDUxNH0.m-Nh8NlHsIjRsLY7wvgJq2YoTlBKo43Kv-LYBuSsR7o"}'::jsonb,
    body:='{"type": "launch"}'::jsonb
  );
$$);
select cron.schedule('myra-launch-5', '30 15 * * *', $$
  SELECT net.http_post(
    url:='https://tzvttqrxfxhqtidlvdlu.supabase.co/functions/v1/zara-scheduled',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6dnR0cXJ4ZnhocXRpZGx2ZGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NDQ1MTQsImV4cCI6MjA4NjMyMDUxNH0.m-Nh8NlHsIjRsLY7wvgJq2YoTlBKo43Kv-LYBuSsR7o"}'::jsonb,
    body:='{"type": "launch"}'::jsonb
  );
$$);