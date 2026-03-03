-- Fix allowlist: add correct GitHub username
INSERT INTO public.idealist_allowed_users (github_username)
VALUES ('ehoyos007')
ON CONFLICT (github_username) DO NOTHING;
