# Imobiliário ML

App para o dia a dia do corretor de imóveis — **Android, iOS e Windows** (e pronto para virar site).

| | |
|---|---|
| 🎙️ **Captação por voz** | O corretor descreve o imóvel falando; o app transcreve e o assistente (Claude) preenche tipo, valores, áreas, quartos, endereço, características e escreve o texto do anúncio. Também cadastra clientes por voz. |
| 🏢 **Portfólio** | Imóveis e empreendimentos com fotos (galeria ou câmera, capa e ordem), ficha técnica, mapa e envio pelo WhatsApp com assinatura da imobiliária. |
| 🧭 **Funil do cliente** | Primeiro contato → Agendamento → Visita → Negociação → Documentação (venda) → Entrega das chaves. Kanban no desktop, checklist de documentos, linha do tempo e motivo de perda. |
| 📅 **Agenda** | Visitas, reuniões, assinaturas, vistorias e entregas de chaves, com lembrete no celular e confirmação pelo WhatsApp em um toque. |
| 🎯 **Compatibilidade** | Cruza o perfil de busca do cliente com o portfólio e sugere imóveis (e clientes para cada imóvel). |
| 📊 **Painel** | Compromissos do dia, atendimentos ativos, valor em negociação, fechados no mês e clientes sem retorno há 5+ dias. |
| 🎨 **Marca própria** | Nome, slogan, CRECI e logo da imobiliária customizados (o ícone do app é o padrão). |
| 🔐 **Acesso por convite** | Tabela `imobiliario_usuario` (mesmos campos de `assistencia_usuarios`), administrador por imobiliária e senha provisória no primeiro acesso. |

## Tecnologia

- [Expo](https://expo.dev) SDK 58 + React Native + Expo Router (TypeScript) — um código para celular, desktop e web
- [Supabase](https://supabase.com) — login, banco (RLS por imobiliária), fotos (Storage) e Edge Function
- Reconhecimento de voz no aparelho (`expo-speech-recognition`, pt-BR) + Claude (`claude-opus-5-5`) para estruturar o texto
- Electron para o instalador do Windows

## Primeiros passos

1. **Banco:** rode `supabase/migrations/20261125_imobiliario.sql` no SQL Editor do Supabase — [docs/SUPABASE.md](docs/SUPABASE.md)
2. **Assistente de voz:** publique a Edge Function `imobiliario-ia` com a chave da Anthropic — [docs/SUPABASE.md](docs/SUPABASE.md#2-assistente-de-voz-edge-function-imobiliario-ia)
3. **Instaladores:** GitHub → Actions → *Gerar instaladores* → Run workflow (ou crie uma tag `v1.0.0`) — [docs/BUILD.md](docs/BUILD.md)

## Desenvolvimento

```bash
npm install
npm run web          # testar no navegador
npx expo run:android # build de desenvolvimento no celular (o ditado usa módulo nativo)
npm run typecheck && npm run lint
```

## Estrutura

```
src/app/            telas (Expo Router)
  (tabs)/           Início, Funil, Agenda, Portfólio, Mais
  imovel/ cliente/ negocio/ agendamento/ usuarios/
src/components/     DitadoVoz, GaleriaFotos, CartaoImovel, MenuLateral, Marca, ui…
src/lib/            supabase, conta (acesso), store (dados), dominio (funil e regras), ia, fotos
supabase/           migração SQL e Edge Function do assistente
desktop/            Electron (Windows)
.github/workflows/  instaladores (APK, IPA, EXE, Web) e publicação da Edge Function
```
