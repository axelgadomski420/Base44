-- PURRE social schema. Seed accounts are editorial (not login users).

create table if not exists profiles (
  user_id text primary key,
  handle text unique not null,
  display_name text not null,
  bio text not null default '',
  city text not null default '',
  avatar text,
  cover text,
  account_type text not null default 'user',
  role text not null default 'user',
  kennel_name text not null default '',
  verified_breeder boolean not null default false,
  premium_until timestamptz,
  banned_until timestamptz,
  warning_count int not null default 0,
  wallet_coins int not null default 0,
  public_key text,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id text primary key,
  user_id text not null,
  kind text not null default 'post',
  body text not null default '',
  media jsonb not null default '[]',
  audio_id text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists posts_kind_created_idx on posts (kind, created_at desc);
create index if not exists posts_user_idx on posts (user_id);

create table if not exists comments (
  id text primary key,
  post_id text not null,
  user_id text not null,
  body text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on comments (post_id, created_at);

create table if not exists likes (
  user_id text not null,
  post_id text not null,
  primary key (user_id, post_id)
);

create table if not exists follows (
  follower_id text not null,
  followee_id text not null,
  primary key (follower_id, followee_id)
);

create table if not exists listings (
  id text primary key,
  user_id text not null,
  title text not null,
  species text not null,
  breed text not null default '',
  price_pln int not null default 0,
  city text not null default '',
  body text not null default '',
  media jsonb not null default '[]',
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id text primary key,
  slug text unique not null,
  owner_id text not null,
  name text not null,
  about text not null default '',
  cover text,
  privacy text not null default 'public',
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  group_id text not null,
  user_id text not null,
  role text not null default 'member',
  primary key (group_id, user_id)
);

create table if not exists group_posts (
  id text primary key,
  group_id text not null,
  user_id text not null,
  body text not null,
  media jsonb not null default '[]',
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists group_posts_group_idx on group_posts (group_id, created_at desc);

create table if not exists conversations (
  id text primary key,
  kind text not null default 'dm',
  title text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists conversation_members (
  conversation_id text not null,
  user_id text not null,
  last_read_at timestamptz,
  typing_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id text primary key,
  conversation_id text not null,
  sender_id text not null,
  body text not null default '',
  ciphertext text,
  media jsonb not null default '[]',
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages (conversation_id, created_at);

create table if not exists message_reactions (
  message_id text not null,
  user_id text not null,
  emoji text not null,
  primary key (message_id, user_id)
);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  body text not null default '',
  href text not null default '/',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

create table if not exists reports (
  id text primary key,
  reporter_id text not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists breeder_apps (
  id text primary key,
  user_id text not null,
  kennel_name text not null,
  bio text not null,
  docs_note text not null default '',
  status text not null default 'pending',
  llm_summary text,
  llm_score int,
  llm_flags text not null default '',
  llm_recommendation text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists ads (
  id text primary key,
  sponsor text not null,
  title text not null,
  body text not null,
  href text not null default '/premium',
  image text,
  active boolean not null default true
);

create table if not exists wallet_tx (
  id text primary key,
  user_id text not null,
  amount int not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists tracks (
  id text primary key,
  title text not null,
  artist text not null,
  mood text not null,
  bpm int not null
);

insert into profiles (user_id, handle, display_name, bio, city, avatar, cover, account_type, role, kennel_name, verified_breeder, wallet_coins)
values
  ('seed-lena', 'lena.atelier', 'Lena Atelier', 'Buldogi francuskie. Małe mioty, duże okna, zero pośpiechu.', 'Sopot', '/media/bulldog.jpg', '/media/studio.jpg', 'breeder', 'user', 'Atelier Buldog', true, 0),
  ('seed-marek', 'marek.okno', 'Marek Okno', 'Koty, które wybierają ludzi, nie odwrotnie. Parapet i cisza.', 'Kraków', '/media/tabby.jpg', '/media/orange.jpg', 'breeder', 'user', 'Okno i Mruczek', true, 0),
  ('seed-ola', 'ola.szuka', 'Ola Wrona', 'Szukam spokojnego psa do mieszkania z ogrodem wielkości chustki.', 'Warszawa', '/media/whitedog.jpg', '/media/park.jpg', 'user', 'user', '', false, 40),
  ('seed-purre', 'purre', 'PURRE', 'Redakcja. Hodowle, adopcje, krótkie filmy.', 'Polska', '/media/pug.jpg', '/media/studio.jpg', 'user', 'admin', '', false, 0)
on conflict (user_id) do nothing;

insert into posts (id, user_id, kind, body, media, audio_id, created_at) values
  ('post-lena-1', 'seed-lena', 'post', 'Miot zimy zostaje dłużej w domu. Trzy suczki, matka Hera, badania w karcie — bez „ostatniej sztuki”.', '[{"type":"image","url":"/media/bulldog.jpg"},{"type":"image","url":"/media/puppy.jpg"}]', null, now() - interval '5 hours'),
  ('post-marek-1', 'seed-marek', 'post', 'Parapet o 7:12. Jeśli szukasz kota do ciszy, nie do cyrku, napisz konkretnie jak mieszkasz.', '[{"type":"image","url":"/media/tabby.jpg"}]', null, now() - interval '3 hours'),
  ('post-ola-1', 'seed-ola', 'post', 'Oddam kanapę, czas i nudne spacery. Szukam psa, który nie musi być rasowy, musi być uczciwie opisany.', '[{"type":"image","url":"/media/park.jpg"}]', null, now() - interval '80 minutes'),
  ('post-lena-2', 'seed-lena', 'post', 'Studio po remoncie: dąb, len, jedno miejsce mniej na klatki. Zostają legowiska.', '[{"type":"image","url":"/media/studio.jpg"}]', null, now() - interval '26 hours'),
  ('reel-1', 'seed-lena', 'reel', 'Hera uczy szczeniaki, że miska nie ucieka.', '[{"type":"image","url":"/media/puppy.jpg"}]', 'amber-walk', now() - interval '2 hours'),
  ('reel-2', 'seed-marek', 'reel', 'Poranne przeciąganie. Dźwięk jest częścią kadru.', '[{"type":"image","url":"/media/orange.jpg"}]', 'linen-purr', now() - interval '40 minutes'),
  ('reel-3', 'seed-ola', 'reel', 'Park, dwa psy, zero smyczy w kadrze — bo to nie ich film.', '[{"type":"image","url":"/media/runners.jpg"}]', 'park-hop', now() - interval '8 hours'),
  ('reel-4', 'seed-marek', 'reel', 'Nocne okno i jeden kot, który udaje, że nie pozuje.', '[{"type":"image","url":"/media/bowie.jpg"}]', 'night-window', now() - interval '14 hours')
on conflict (id) do nothing;

insert into comments (id, post_id, user_id, body, created_at) values
  ('c1', 'post-lena-1', 'seed-ola', 'Piękna Hera. Czy miot jest już zarezerwowany w całości?', now() - interval '4 hours'),
  ('c2', 'post-lena-1', 'seed-lena', 'Została jedna suczka. Karta idzie przed zaliczką.', now() - interval '3 hours'),
  ('c3', 'post-marek-1', 'seed-ola', 'Mieszkam cicho, trzecie piętro, siatka w oknie jest.', now() - interval '2 hours')
on conflict (id) do nothing;

insert into follows (follower_id, followee_id) values
  ('seed-ola', 'seed-lena'),
  ('seed-ola', 'seed-marek'),
  ('seed-marek', 'seed-lena'),
  ('seed-lena', 'seed-marek')
on conflict do nothing;

insert into groups (id, slug, owner_id, name, about, cover) values
  ('g-buldog', 'buldogi-z-klasa', 'seed-lena', 'Buldogi z klasą', 'Oddech, ruch, zero memów o „brzydkim piesku”. Wymieniamy weterynarzy i plany miotów.', '/media/bulldog.jpg'),
  ('g-okno', 'koci-parapet', 'seed-marek', 'Koci parapet', 'Grupa dla ludzi, którzy poważnie traktują siatki, kuwety i nudę kota.', '/media/tabby.jpg'),
  ('g-adop', 'adopcje-mazowsze', 'seed-ola', 'Adopcje Mazowsze', 'Ogłoszenia adopcyjne bez filtrów upiększających. Pisz prawdę o charakterze.', '/media/park.jpg')
on conflict (id) do nothing;

insert into group_members (group_id, user_id, role) values
  ('g-buldog', 'seed-lena', 'owner'),
  ('g-buldog', 'seed-ola', 'member'),
  ('g-okno', 'seed-marek', 'owner'),
  ('g-okno', 'seed-lena', 'member'),
  ('g-adop', 'seed-ola', 'owner'),
  ('g-adop', 'seed-marek', 'member')
on conflict do nothing;

insert into group_posts (id, group_id, user_id, body, media, created_at) values
  ('gp1', 'g-buldog', 'seed-lena', 'Przypominam: zdjęcie zgiętego ogona bez opisu kręgosłupa nie przejdzie. Wrzucajcie karty, nie tylko mordki.', '[{"type":"image","url":"/media/bulldog.jpg"}]', now() - interval '6 hours'),
  ('gp2', 'g-okno', 'seed-marek', 'Jaka siatka na okno dachowe? Szukam czegoś, co nie wygląda jak klatka w salonie.', '[]', now() - interval '90 minutes'),
  ('gp3', 'g-adop', 'seed-ola', 'W weekend jedziemy do schroniska w Nowym Dworze. Kto ma miejsce w aucie z Woli?', '[{"type":"image","url":"/media/whitedog.jpg"}]', now() - interval '1 day')
on conflict (id) do nothing;

insert into listings (id, user_id, title, species, breed, price_pln, city, body, media, created_at) values
  ('list-1', 'seed-lena', 'Suczka buldoga francuskiego', 'pies', 'Buldog francuski', 7500, 'Sopot', 'Z rezerwacji, odbiór po 10. tygodniu. Rodzice przebadani, umowa i paszport. Nie wysyłam.', '[{"type":"image","url":"/media/puppy.jpg"},{"type":"image","url":"/media/bulldog.jpg"}]', now() - interval '7 hours'),
  ('list-2', 'seed-marek', 'Kocurek brytyjski, niebieski', 'kot', 'Brytyjski krótkowłosy', 4200, 'Kraków', 'Zostaje jeden kocur. Przywiązany do ludzi, nie do walizki. Wizyta przed zaliczką.', '[{"type":"image","url":"/media/kitten.jpg"}]', now() - interval '12 hours'),
  ('list-3', 'seed-ola', 'Adopcja — spokojny mieszaniec', 'pies', 'Mieszaniec', 0, 'Warszawa', 'Pies ze schroniska, ok. 4 lata, chodzi na smyczy, nie lubi hulajnóg. Opłata adopcyjna 0.', '[{"type":"image","url":"/media/whitedog.jpg"}]', now() - interval '2 days')
on conflict (id) do nothing;

insert into tracks (id, title, artist, mood, bpm) values
  ('amber-walk', 'Bursztynowy spacer', 'PURRE Studio', 'ciepły', 92),
  ('linen-purr', 'Lniane mruczenie', 'PURRE Studio', 'lo-fi', 76),
  ('park-hop', 'Parkowy hop', 'PURRE Studio', 'żywy', 118),
  ('night-window', 'Nocne okno', 'PURRE Studio', 'ambient', 68),
  ('kennel-dawn', 'Świt hodowli', 'PURRE Studio', 'akustyczny', 96),
  ('coin-jingle', 'Moneta w misce', 'PURRE Studio', 'jasny', 126)
on conflict (id) do nothing;

insert into ads (id, sponsor, title, body, href, image, active) values
  ('ad-1', 'Miska & Len', 'Miska, która nie krzyczy', 'Kamionka i len. Przedmioty do domu, nie do witryny zoologicznej.', '/premium', '/media/studio.jpg', true),
  ('ad-2', 'Nordic Paw', 'Karma bez konfetti', 'Jeden skład, czytelna etykieta. Dla psów, które mają robotę: leżeć w słońcu.', '/market', '/media/golden.jpg', true),
  ('ad-3', 'Atelier Obroża', 'Skóra, nie plastik', 'Obroże szyte w małej pracowni. Premium wyłącza tę planszę.', '/premium', '/media/pug.jpg', true)
on conflict (id) do nothing;
