-- =====================================================================================
-- Imobiliário ML — estrutura completa da base (Supabase)
-- Como aplicar: Supabase > SQL Editor > New query > cole este arquivo inteiro > Run.
-- Pode rodar mais de uma vez sem problema.
--
-- Controle de acesso (mesmo modelo do Assistência ML)
--  * imobiliario_usuario tem os MESMOS campos de assistencia_usuarios.
--    (o nome é sem acento: no Postgres "imobiliário_usuário" exigiria aspas em toda
--     consulta e quebra a API REST do Supabase)
--  * Ninguém cria conta sozinho. O ADMINISTRADOR GERAL (mapl11@hotmail.com) cadastra o
--    acesso: e-mail + senha provisória, escolhendo a imobiliária (ou criando uma nova).
--  * No primeiro acesso a pessoa troca a senha provisória (trocar_senha).
--  * Cada imobiliária é identificada pela conta do dono (owner_id). O admin da imobiliária
--    gerencia somente os corretores da própria imobiliária.
--  * imobiliario_dono() devolve a imobiliária do usuário logado; todas as regras (RLS) das
--    tabelas imobiliario_* comparam owner_id com ela.
-- =====================================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1) Usuários (controle de acesso) ----------------------------------------------------
create table if not exists public.imobiliario_usuario (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  user_id uuid unique references auth.users (id) on delete set null,
  email text not null unique check (email = lower(email)),
  nome text not null default '',
  admin boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  trocar_senha boolean not null default false
);
create index if not exists imobiliario_usuario_owner_idx on public.imobiliario_usuario (owner_id);
comment on table public.imobiliario_usuario is 'Acessos ao Imobiliário ML (mesmos campos de assistencia_usuarios)';
comment on column public.imobiliario_usuario.admin is 'true = administrador da imobiliária; false = corretor';
comment on column public.imobiliario_usuario.trocar_senha is 'true = ainda usa a senha provisória; o app pede a troca ao entrar';

-- Administrador geral: registro próprio, sempre admin
insert into public.imobiliario_usuario (owner_id, user_id, email, nome, admin)
select u.id, u.id, lower(u.email), 'Marcel Lisboa', true
from auth.users u
where lower(u.email) = 'mapl11@hotmail.com'
on conflict (email) do update set admin = true, ativo = true;

-- 2) Funções de conta --------------------------------------------------------------------
create or replace function public.imobiliario_email()
returns text language sql stable set search_path = public as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.imobiliario_eh_admin_geral()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from auth.users u where u.id = auth.uid() and lower(u.email) = 'mapl11@hotmail.com')
$$;

-- Imobiliária do usuário logado. Sem registro ou desativado => null (sem acesso a nada).
create or replace function public.imobiliario_dono()
returns uuid language sql stable security definer set search_path = public as $$
  select u.owner_id from imobiliario_usuario u where u.user_id = auth.uid() and u.ativo limit 1
$$;

create or replace function public.imobiliario_eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.imobiliario_eh_admin_geral()
    or coalesce((select u.admin and u.ativo from imobiliario_usuario u where u.user_id = auth.uid()), false)
$$;

-- 3) Dados da imobiliária (nome e logo customizados) ----------------------------------
create table if not exists public.imobiliario_empresa (
  owner_id uuid primary key default public.imobiliario_dono() references auth.users (id) on delete cascade,
  nome text not null default '',
  slogan text not null default '',
  creci text not null default '',
  telefone text not null default '',
  email text not null default '',
  instagram text not null default '',
  site text not null default '',
  logo_url text,
  atualizado_em timestamptz not null default now()
);

-- Chamado pelo app ao entrar: devolve a situação da conta
create or replace function public.imobiliario_minha_conta()
returns json language plpgsql volatile security definer set search_path = public as $$
declare
  r imobiliario_usuario;
begin
  if auth.uid() is null then
    return null;
  end if;
  -- cadastro feito pelo e-mail antes de a conta existir: liga ao login agora
  update imobiliario_usuario set user_id = auth.uid()
  where email = public.imobiliario_email() and user_id is null
    and not exists (select 1 from imobiliario_usuario x where x.user_id = auth.uid());

  select * into r from imobiliario_usuario where user_id = auth.uid();
  return json_build_object(
    'situacao', case when r.id is null then 'sem_acesso' when not r.ativo then 'desativado' else 'ok' end,
    'dono', public.imobiliario_dono(),
    'nome', coalesce(r.nome, ''),
    'admin', public.imobiliario_eh_admin(),
    'admin_geral', public.imobiliario_eh_admin_geral(),
    'trocar_senha', coalesce(r.trocar_senha, false),
    'empresa', (select e.nome from imobiliario_empresa e where e.owner_id = r.owner_id)
  );
end $$;

create or replace function public.imobiliario_senha_trocada()
returns void language sql volatile security definer set search_path = public as $$
  update imobiliario_usuario set trocar_senha = false where user_id = auth.uid();
$$;

-- Imobiliárias cadastradas (somente administrador geral)
create or replace function public.imobiliario_empresas()
returns table (owner_id uuid, nome text, dono_email text, usuarios bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.imobiliario_eh_admin_geral() then
    raise exception 'Somente o administrador geral pode ver as imobiliárias.';
  end if;
  return query
    select u.owner_id,
           coalesce(nullif(e.nome, ''), max(case when u.user_id = u.owner_id then u.nome end), '')::text,
           coalesce(max(case when u.user_id = u.owner_id then u.email end), '')::text,
           count(*)
    from imobiliario_usuario u
    left join imobiliario_empresa e on e.owner_id = u.owner_id
    group by u.owner_id, e.nome
    order by 2;
end $$;

-- Cadastra um acesso com senha provisória.
--  p_empresa: imobiliária (owner_id) onde a pessoa entra. null = nova imobiliária (só admin
--             geral), e a pessoa vira dona e administradora dela.
--  Se o e-mail já tiver login (ex.: outro app da ML Softwares), só libera o acesso.
create or replace function public.imobiliario_criar_usuario(
  p_email text, p_senha text, p_nome text, p_admin boolean,
  p_empresa uuid default null, p_nova_empresa text default null
)
returns json language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_nome text := trim(coalesce(p_nome, ''));
  v_geral boolean := public.imobiliario_eh_admin_geral();
  v_uid uuid;
  v_novo boolean := false;
  v_dono uuid;
begin
  if not public.imobiliario_eh_admin() then
    raise exception 'Somente administradores podem cadastrar usuários.';
  end if;
  if v_email !~ '^\S+@\S+\.\S+$' then
    raise exception 'Informe um e-mail válido.';
  end if;
  if p_empresa is null then
    if not v_geral then
      raise exception 'Somente o administrador geral pode criar imobiliárias.';
    end if;
    if trim(coalesce(p_nova_empresa, '')) = '' then
      raise exception 'Informe o nome da nova imobiliária.';
    end if;
  elsif not v_geral and p_empresa is distinct from public.imobiliario_dono() then
    raise exception 'Você só pode cadastrar usuários da sua imobiliária.';
  elsif not exists (select 1 from imobiliario_usuario where owner_id = p_empresa) then
    raise exception 'Imobiliária não encontrada.';
  end if;
  if exists (select 1 from imobiliario_usuario where email = v_email) then
    raise exception 'Este e-mail já tem acesso a uma imobiliária.';
  end if;

  select id into v_uid from auth.users where lower(email) = v_email limit 1;
  if v_uid is not null and exists (select 1 from imobiliario_usuario where user_id = v_uid) then
    raise exception 'Este e-mail já tem acesso a uma imobiliária.';
  end if;

  if v_uid is null then
    if length(coalesce(p_senha, '')) < 6 then
      raise exception 'A senha provisória precisa ter pelo menos 6 caracteres.';
    end if;
    v_uid := gen_random_uuid();
    v_novo := true;
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email,
      crypt(p_senha, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('app', 'Imobiliario ML', 'nome', v_nome),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid::text, v_uid,
            jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
            'email', now(), now(), now());
  end if;

  v_dono := coalesce(p_empresa, v_uid);
  insert into imobiliario_usuario (owner_id, user_id, email, nome, admin, trocar_senha)
  values (v_dono, v_uid, v_email, v_nome, p_empresa is null or coalesce(p_admin, false), v_novo);

  if p_empresa is null then
    insert into imobiliario_empresa (owner_id, nome) values (v_uid, trim(p_nova_empresa))
    on conflict (owner_id) do update set nome = excluded.nome;
  end if;

  return json_build_object('ja_tinha_conta', not v_novo, 'empresa', v_dono);
end $$;

-- Nova senha provisória (somente administrador geral)
create or replace function public.imobiliario_redefinir_senha(p_id uuid, p_senha text)
returns void language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_uid uuid;
begin
  if not public.imobiliario_eh_admin_geral() then
    raise exception 'Somente o administrador geral pode redefinir senhas.';
  end if;
  if length(coalesce(p_senha, '')) < 6 then
    raise exception 'A senha provisória precisa ter pelo menos 6 caracteres.';
  end if;
  select user_id into v_uid from imobiliario_usuario where id = p_id;
  if v_uid is null then
    raise exception 'Usuário não encontrado.';
  end if;
  update auth.users set encrypted_password = crypt(p_senha, gen_salt('bf')), updated_at = now() where id = v_uid;
  update imobiliario_usuario set trocar_senha = true where id = p_id;
end $$;

revoke all on function public.imobiliario_minha_conta(), public.imobiliario_senha_trocada(),
  public.imobiliario_empresas(), public.imobiliario_criar_usuario(text, text, text, boolean, uuid, text),
  public.imobiliario_redefinir_senha(uuid, text) from public, anon;
grant execute on function public.imobiliario_minha_conta(), public.imobiliario_senha_trocada(),
  public.imobiliario_empresas(), public.imobiliario_criar_usuario(text, text, text, boolean, uuid, text),
  public.imobiliario_redefinir_senha(uuid, text), public.imobiliario_dono(), public.imobiliario_eh_admin(),
  public.imobiliario_eh_admin_geral(), public.imobiliario_email() to authenticated;

-- Regras de imobiliario_usuario
alter table public.imobiliario_usuario enable row level security;

drop policy if exists "usuario: ver" on public.imobiliario_usuario;
create policy "usuario: ver" on public.imobiliario_usuario for select to authenticated
  using (owner_id = public.imobiliario_dono() or user_id = auth.uid() or public.imobiliario_eh_admin_geral());

drop policy if exists "usuario: admin altera" on public.imobiliario_usuario;
create policy "usuario: admin altera" on public.imobiliario_usuario for update to authenticated
  using ((public.imobiliario_eh_admin_geral() or (owner_id = public.imobiliario_dono() and public.imobiliario_eh_admin()))
         and user_id is distinct from owner_id and email <> 'mapl11@hotmail.com')
  with check (public.imobiliario_eh_admin_geral() or (owner_id = public.imobiliario_dono() and public.imobiliario_eh_admin()));

drop policy if exists "usuario: admin remove" on public.imobiliario_usuario;
create policy "usuario: admin remove" on public.imobiliario_usuario for delete to authenticated
  using ((public.imobiliario_eh_admin_geral() or (owner_id = public.imobiliario_dono() and public.imobiliario_eh_admin()))
         and user_id is distinct from owner_id and email <> 'mapl11@hotmail.com');

revoke insert, update on public.imobiliario_usuario from anon, authenticated;
grant select, delete on public.imobiliario_usuario to authenticated;
grant update (nome, admin, ativo) on public.imobiliario_usuario to authenticated;

-- 4) Tabelas de trabalho ------------------------------------------------------------------
create table if not exists public.imobiliario_clientes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default public.imobiliario_dono() references auth.users (id) on delete cascade,
  corretor_id uuid default auth.uid() references auth.users (id) on delete set null,
  nome text not null,
  telefone text not null default '',
  email text not null default '',
  documento text not null default '',
  origem text not null default '',
  -- perfil de busca: { finalidade, tipos[], bairros, preco_max, quartos_min }
  interesse jsonb not null default '{}'::jsonb,
  notas text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.imobiliario_imoveis (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default public.imobiliario_dono() references auth.users (id) on delete cascade,
  corretor_id uuid default auth.uid() references auth.users (id) on delete set null,
  codigo text not null default '',
  titulo text not null default '',
  tipo text not null default 'apartamento',
  finalidade text not null default 'venda' check (finalidade in ('venda', 'aluguel', 'venda_aluguel')),
  status text not null default 'disponivel' check (status in ('disponivel', 'reservado', 'vendido', 'alugado', 'inativo')),
  empreendimento text not null default '',
  construtora text not null default '',
  preco_venda numeric(14, 2),
  valor_aluguel numeric(12, 2),
  condominio numeric(12, 2),
  iptu numeric(12, 2),
  area_util numeric(10, 2),
  area_total numeric(10, 2),
  quartos int,
  suites int,
  banheiros int,
  vagas int,
  andar text not null default '',
  ano_construcao int,
  mobiliado text not null default '' check (mobiliado in ('', 'sim', 'nao', 'semi')),
  cep text not null default '',
  logradouro text not null default '',
  numero text not null default '',
  complemento text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  uf text not null default '',
  caracteristicas text[] not null default '{}',
  proximidades text[] not null default '{}',
  descricao text not null default '',
  -- [{ path, url }] — a primeira é a capa
  fotos jsonb not null default '[]'::jsonb,
  transcricao text not null default '',
  proprietario_nome text not null default '',
  proprietario_telefone text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.imobiliario_negocios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default public.imobiliario_dono() references auth.users (id) on delete cascade,
  corretor_id uuid default auth.uid() references auth.users (id) on delete set null,
  cliente_id uuid not null references public.imobiliario_clientes (id) on delete cascade,
  imovel_id uuid references public.imobiliario_imoveis (id) on delete set null,
  tipo text not null default 'venda' check (tipo in ('venda', 'aluguel')),
  fase text not null default 'primeiro_contato' check (fase in (
    'primeiro_contato', 'agendamento', 'visita', 'negociacao', 'documentacao', 'entrega_chaves', 'concluido', 'perdido')),
  valor numeric(14, 2),
  motivo_perda text not null default '',
  -- checklist da documentação: [{ nome, ok }]
  documentos jsonb not null default '[]'::jsonb,
  -- linha do tempo: [{ fase, data, nota }]
  historico jsonb not null default '[]'::jsonb,
  notas text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.imobiliario_agendamentos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default public.imobiliario_dono() references auth.users (id) on delete cascade,
  corretor_id uuid default auth.uid() references auth.users (id) on delete set null,
  titulo text not null default '',
  tipo text not null default 'visita' check (tipo in (
    'visita', 'reuniao', 'ligacao', 'assinatura', 'vistoria', 'entrega_chaves', 'outro')),
  inicio timestamptz not null,
  duracao_min int not null default 60,
  cliente_id uuid references public.imobiliario_clientes (id) on delete set null,
  imovel_id uuid references public.imobiliario_imoveis (id) on delete set null,
  negocio_id uuid references public.imobiliario_negocios (id) on delete set null,
  local text not null default '',
  notas text not null default '',
  status text not null default 'agendado' check (status in ('agendado', 'confirmado', 'realizado', 'cancelado')),
  lembrete_min int not null default 60,
  criado_em timestamptz not null default now()
);

create index if not exists imobiliario_clientes_owner_idx on public.imobiliario_clientes (owner_id);
create index if not exists imobiliario_imoveis_owner_idx on public.imobiliario_imoveis (owner_id);
create index if not exists imobiliario_negocios_owner_idx on public.imobiliario_negocios (owner_id, fase);
create index if not exists imobiliario_agendamentos_owner_idx on public.imobiliario_agendamentos (owner_id, inicio);

-- atualizado_em automático
create or replace function public.imobiliario_tocar()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['imobiliario_clientes', 'imobiliario_imoveis', 'imobiliario_negocios', 'imobiliario_empresa'] loop
    execute format('drop trigger if exists tocar on public.%I', t);
    execute format('create trigger tocar before update on public.%I for each row execute function public.imobiliario_tocar()', t);
  end loop;
end $$;

-- Regras: cada imobiliária só vê e altera os próprios dados
do $$
declare
  t text;
begin
  foreach t in array array['imobiliario_clientes', 'imobiliario_imoveis', 'imobiliario_negocios',
                           'imobiliario_agendamentos', 'imobiliario_empresa'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "dados da imobiliaria" on public.%I', t);
    execute format($p$create policy "dados da imobiliaria" on public.%I for all to authenticated
                     using (owner_id = public.imobiliario_dono())
                     with check (owner_id = public.imobiliario_dono())$p$, t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- Só o administrador altera nome/logo da imobiliária
drop policy if exists "dados da imobiliaria" on public.imobiliario_empresa;
drop policy if exists "empresa: ver" on public.imobiliario_empresa;
create policy "empresa: ver" on public.imobiliario_empresa for select to authenticated
  using (owner_id = public.imobiliario_dono() or public.imobiliario_eh_admin_geral());
drop policy if exists "empresa: admin grava" on public.imobiliario_empresa;
create policy "empresa: admin grava" on public.imobiliario_empresa for all to authenticated
  using (owner_id = public.imobiliario_dono() and public.imobiliario_eh_admin())
  with check (owner_id = public.imobiliario_dono() and public.imobiliario_eh_admin());

-- 5) Fotos (Supabase Storage) -------------------------------------------------------------
-- Bucket público para leitura (as fotos aparecem no portfólio e nos links enviados ao
-- cliente). Gravação só dentro da pasta da própria imobiliária: <owner_id>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imobiliario-fotos', 'imobiliario-fotos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "imobiliario fotos: enviar" on storage.objects;
create policy "imobiliario fotos: enviar" on storage.objects for insert to authenticated
  with check (bucket_id = 'imobiliario-fotos' and (storage.foldername(name))[1] = public.imobiliario_dono()::text);

drop policy if exists "imobiliario fotos: alterar" on storage.objects;
create policy "imobiliario fotos: alterar" on storage.objects for update to authenticated
  using (bucket_id = 'imobiliario-fotos' and (storage.foldername(name))[1] = public.imobiliario_dono()::text);

drop policy if exists "imobiliario fotos: apagar" on storage.objects;
create policy "imobiliario fotos: apagar" on storage.objects for delete to authenticated
  using (bucket_id = 'imobiliario-fotos' and (storage.foldername(name))[1] = public.imobiliario_dono()::text);

-- Conferência
select email, nome, admin, ativo, trocar_senha, (user_id = owner_id) as dono_da_imobiliaria
from public.imobiliario_usuario order by owner_id, criado_em;
