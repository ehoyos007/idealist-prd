-- Add danrami142-glitch to the allowlist
INSERT INTO public.idealist_allowed_users (github_username)
VALUES ('danrami142-glitch')
ON CONFLICT (github_username) DO NOTHING;
