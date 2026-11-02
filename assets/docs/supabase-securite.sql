-- ============================================================
-- Sécurité de la base Supabase : RLS et politiques d'accès
--
-- Utilisation : coller tout le script dans le SQL Editor de Supabase,
-- puis cliquer sur Run. Le script est dans une transaction : en cas
-- d'erreur, rien n'est modifié. Il peut être relancé sans danger.
--
-- Principe : la clé publique est visible dans le code du site, donc
-- seules les politiques RLS protègent les données. Une fois RLS activé,
-- rien n'est accessible sans politique.
--
-- Les comparaisons passent par ::text pour fonctionner quel que soit
-- le type (uuid ou text) des colonnes user_id et destinataire_id.
--
-- Prérequis : la confirmation d'email doit être désactivée, car le
-- profil est créé par le navigateur juste après l'inscription et
-- l'utilisateur doit déjà être connecté à ce moment-là.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. profiles : liste des contacts
--    Lecture pour tous les utilisateurs connectés, création et
--    modification de son propre profil seulement.
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_lecture on public.profiles;
create policy profiles_lecture
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists profiles_creation_propre on public.profiles;
create policy profiles_creation_propre
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid())::text = user_id::text);

drop policy if exists profiles_modification_propre on public.profiles;
create policy profiles_modification_propre
  on public.profiles for update
  to authenticated
  using ((select auth.uid())::text = user_id::text)
  with check ((select auth.uid())::text = user_id::text);

-- ------------------------------------------------------------
-- 2. messages : messages directs et messages de salons publics
--    Un message direct (sans salon) n'est visible que par son
--    expéditeur et son destinataire. Un message de salon public
--    (channel_id renseigné) est visible par tous les utilisateurs
--    connectés. On ne peut envoyer un message qu'en son propre nom.
--    Pas de politique de suppression, et les messages envoyés ne
--    peuvent plus être changés (sauf les accusés de réception, voir
--    plus bas).
-- ------------------------------------------------------------

-- Un message de salon n'a pas de destinataire, un message direct n'a pas de salon
alter table public.messages alter column destinataire_id drop not null;
alter table public.messages alter column channel_id drop not null;

alter table public.messages enable row level security;

drop policy if exists messages_lecture on public.messages;
create policy messages_lecture
  on public.messages for select
  to authenticated
  using (
    channel_id is not null
    or (select auth.uid())::text = user_id::text
    or (select auth.uid())::text = destinataire_id::text
  );

drop policy if exists messages_envoi on public.messages;
create policy messages_envoi
  on public.messages for insert
  to authenticated
  with check ((select auth.uid())::text = user_id::text);

-- Accusés de réception : le destinataire d'un message direct peut le marquer
-- comme reçu (delivered_at) ou lu (read_at). Seules ces deux colonnes sont
-- modifiables : le contenu d'un message ne peut jamais être changé.
alter table public.messages add column if not exists delivered_at timestamptz;
alter table public.messages add column if not exists read_at timestamptz;

revoke update on table public.messages from authenticated;
grant update (delivered_at, read_at) on table public.messages to authenticated;

drop policy if exists messages_accuse_reception on public.messages;
create policy messages_accuse_reception
  on public.messages for update
  to authenticated
  using ((select auth.uid())::text = destinataire_id::text)
  with check ((select auth.uid())::text = destinataire_id::text);

-- ------------------------------------------------------------
-- 3. coordonnees : dernière position de chaque utilisateur
--    Chacun n'écrit que sa propre ligne. La lecture est ouverte aux
--    utilisateurs connectés, pour calculer la distance avec un contact.
--    L'index d'unicité est nécessaire à l'upsert du site.
-- ------------------------------------------------------------
create unique index if not exists coordonnees_user_id_unique
  on public.coordonnees (user_id);

alter table public.coordonnees enable row level security;

drop policy if exists coordonnees_lecture on public.coordonnees;
create policy coordonnees_lecture
  on public.coordonnees for select
  to authenticated
  using (true);

drop policy if exists coordonnees_insertion_propre on public.coordonnees;
create policy coordonnees_insertion_propre
  on public.coordonnees for insert
  to authenticated
  with check ((select auth.uid())::text = user_id::text);

drop policy if exists coordonnees_modification_propre on public.coordonnees;
create policy coordonnees_modification_propre
  on public.coordonnees for update
  to authenticated
  using ((select auth.uid())::text = user_id::text)
  with check ((select auth.uid())::text = user_id::text);

-- ------------------------------------------------------------
-- 4. channels : salons (pas encore utilisés par le site)
--    Lecture pour les utilisateurs connectés, le reste réservé au
--    créateur du salon.
-- ------------------------------------------------------------
alter table public.channels enable row level security;

drop policy if exists channels_lecture on public.channels;
create policy channels_lecture
  on public.channels for select
  to authenticated
  using (true);

drop policy if exists channels_creation on public.channels;
create policy channels_creation
  on public.channels for insert
  to authenticated
  with check ((select auth.uid())::text = created_by::text);

drop policy if exists channels_modification on public.channels;
create policy channels_modification
  on public.channels for update
  to authenticated
  using ((select auth.uid())::text = created_by::text)
  with check ((select auth.uid())::text = created_by::text);

drop policy if exists channels_suppression on public.channels;
create policy channels_suppression
  on public.channels for delete
  to authenticated
  using ((select auth.uid())::text = created_by::text);

-- ------------------------------------------------------------
-- 5. Temps réel : messages et salons doivent faire partie de la
--    publication supabase_realtime (sans effet s'ils y sont déjà)
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'channels'
  ) then
    alter publication supabase_realtime add table public.channels;
  end if;
end
$$;

-- ------------------------------------------------------------
-- 6. Défense en profondeur : les visiteurs non connectés (rôle anon)
--    n'ont aucun droit sur ces tables, même sans RLS.
-- ------------------------------------------------------------
revoke all on table
  public.profiles,
  public.messages,
  public.coordonnees,
  public.channels
from anon;

commit;
