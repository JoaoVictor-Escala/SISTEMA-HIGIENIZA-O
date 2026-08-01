UPDATE tenants SET trial_started_at='2020-01-01 00:00:00' WHERE email='joaovicorred@gmail.com';
SELECT email, trial_started_at, subscription_status FROM tenants WHERE email='joaovicorred@gmail.com';
