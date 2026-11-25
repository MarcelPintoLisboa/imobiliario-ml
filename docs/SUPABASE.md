# Base de dados (Supabase)

Projeto: `eoowbybfrbmjxcjfniuu` — a mesma base do Assistência ML. Todas as tabelas deste app
começam com `imobiliario_`, então não há conflito com as tabelas `assistencia_*`.

## 1. Criar as tabelas (uma vez)

Supabase → **SQL Editor** → **New query** → cole o conteúdo de
[`supabase/migrations/20261125_imobiliario.sql`](../supabase/migrations/20261125_imobiliario.sql) → **Run**.

O script pode ser rodado de novo sem problema. Ele cria:

| Tabela / recurso | Para quê |
|---|---|
| `imobiliario_usuario` | Controle de acesso. **Mesmos campos de `assistencia_usuarios`**: `id, owner_id, user_id, email, nome, admin, ativo, criado_em, trocar_senha` |
| `imobiliario_empresa` | Nome, slogan, CRECI, contatos e **logo customizados** da imobiliária |
| `imobiliario_imoveis` | Portfólio: características, valores, endereço, fotos, descrição e a fala original do corretor |
| `imobiliario_clientes` | Clientes e o perfil de busca (finalidade, tipos, bairros, valor máximo, quartos) |
| `imobiliario_negocios` | Funil: Primeiro contato → Agendamento → Visita → Negociação → Documentação (venda) → Entrega das chaves |
| `imobiliario_agendamentos` | Visitas, reuniões, assinaturas, vistorias e entregas de chaves |
| Bucket `imobiliario-fotos` | Fotos dos imóveis e logos (leitura pública; gravação só na pasta da própria imobiliária) |

> Nome da tabela: `imobiliario_usuario` (sem acento). Com acento (`imobiliário_usuário`) o Postgres exige
> aspas em toda consulta e a API REST do Supabase não funciona bem.

### Como funciona o acesso

- Ninguém cria conta sozinho. O **administrador geral** (`mapl11@hotmail.com`) cadastra a imobiliária e o
  dono dela pelo app (**Mais → Acessos e imobiliárias → + Nova imobiliária**), com senha provisória.
- O dono (administrador da imobiliária) cadastra os corretores da equipe.
- No primeiro acesso, cada pessoa cria a própria senha.
- Cada imobiliária só enxerga os próprios dados (regras RLS com `imobiliario_dono()`).
- Quem já tem login em outro app da ML Softwares (ex.: Assistência ML) entra com a mesma senha — só é
  preciso liberar o acesso.

## 2. Assistente de voz (Edge Function `imobiliario-ia`)

> **Sem a função publicada (ou sem chave/crédito/internet), o app continua funcionando:** ele organiza a
> fala no próprio aparelho, com regras simples (`src/lib/organizadorLocal.ts`), e avisa que usou o modo básico.

O corretor fala; o próprio celular transcreve (reconhecimento de voz do Android/iOS, em português) e a
função [`supabase/functions/imobiliario-ia`](../supabase/functions/imobiliario-ia/index.ts) usa o Claude
(Anthropic) para organizar o texto nos campos do imóvel ou do cliente e escrever o texto de anúncio.

### Chave da Anthropic

Crie uma chave em <https://console.anthropic.com> → **API Keys**. Ela fica **somente** no Supabase, nunca no app.

### Publicar — opção A: pelo GitHub (recomendado)

1. Em GitHub → **Settings → Secrets and variables → Actions**, crie:
   - `SUPABASE_ACCESS_TOKEN` — em supabase.com → Account → **Access Tokens**
   - `ANTHROPIC_API_KEY` — a chave da Anthropic
2. Aba **Actions** → *Publicar assistente de voz* → **Run workflow**.
   Depois disso, ela é republicada sozinha sempre que a pasta `supabase/functions` mudar.

### Publicar — opção B: pelo computador

```bash
npx supabase login
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref eoowbybfrbmjxcjfniuu
npx supabase functions deploy imobiliario-ia --project-ref eoowbybfrbmjxcjfniuu --use-api
```

### Detalhes

- A função confere se quem chama tem acesso liberado em `imobiliario_usuario`; sem acesso, responde 403.
- Modelo: `claude-opus-5-5` com saída estruturada (JSON validado por esquema) e esforço `low`, para
  responder rápido em campo. Se o modelo recusar um texto por política, o servidor da Anthropic tenta de
  novo automaticamente em outro modelo (`fallbacks: "default"`).
- Custo: cada "Organizar com IA" envia só o texto ditado (alguns centavos de real por imóvel).
- No **Windows**, o reconhecimento de voz do navegador não funciona dentro do app desktop. O corretor
  digita ou usa o ditado do próprio Windows (**Win + H**) na caixa de texto, e o assistente organiza do
  mesmo jeito.
