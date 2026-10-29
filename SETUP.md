# Yube Flow: Supabase setup (invite-only)

Nobody can sign up on their own. You create each client account from the Admin tab.

1. Create a project at supabase.com.
2. SQL Editor: run `supabase/schema.sql`. (Already ran the older version with trials? Run `supabase/migrate_remove_trial.sql` instead.)
3. Project Settings > API: copy the URL and the **anon** key into `.env` (see `.env.example`). Never put the service_role key in this app.
4. **Authentication > Sign In / Providers: turn OFF "Allow new users to sign up".** This is what really blocks public registration; the app simply has no sign-up screen, but the API would still accept one if this stays on.
5. Authentication > URL Configuration: set Site URL to your deployed address (plus `http://localhost:5173` for local work) so reset-password emails come back to the app.
6. Create yourself: Authentication > Users > Add user (your email and a strong password, tick auto-confirm). Then run in the SQL Editor:
   `update public.profiles set role = 'admin' where email = 'you@example.com';`
7. Deploy the function that creates clients (it holds the secret key on the server):
   ```
   npx supabase login
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase functions deploy create-client
   ```
8. `npm install`, `npm run dev`, sign in. The **Admin** tab lets you add clients (email + generated password), then copy their login details to send them. You can suspend or reactivate any client at any time.

Before launch: set up custom SMTP in Supabase so "forgot password" emails are delivered reliably.
