# Guia de Deploy — Vistoria Obra (Supabase + Vercel)

## 1. Criar projeto no Supabase (gratuito)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **New Project**
3. Escolha um nome (ex: `vistoria-obra`) e uma senha forte para o banco
4. Região: escolha **South America (São Paulo)** para menor latência
5. Aguarde o projeto ser criado (~2 min)

## 2. Configurar o banco de dados

1. No dashboard do Supabase, vá em **SQL Editor**
2. Clique em **New query**
3. Cole todo o conteúdo do arquivo `supabase-setup.sql` deste projeto
4. Clique em **Run** (▶)
5. Deve aparecer "Success" — as tabelas e policies foram criadas

## 3. Configurar autenticação

1. No Supabase, vá em **Authentication → Providers**
2. O provedor **Email** já vem ativado por padrão
3. (Opcional) Para desabilitar confirmação de e-mail durante testes:
   - Vá em **Authentication → Settings**
   - Desmarque **Enable email confirmations**
4. (Opcional) Para login com Google:
   - Vá em **Authentication → Providers → Google**
   - Siga as instruções para configurar OAuth

## 4. Pegar as credenciais do Supabase

No dashboard do Supabase, vá em **Settings → API**. Anote:

- **Project URL** → será `SUPABASE_URL` e `VITE_SUPABASE_URL`
- **anon/public key** → será `SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY`
- **service_role key** → será `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponha no cliente)

## 5. Subir o código para o GitHub

```bash
# Na pasta do projeto
git init
git add .
git commit -m "Vistoria Obra com auth e RLS"
git remote add origin https://github.com/SEU_USUARIO/vistoria-obra.git
git push -u origin main
```

## 6. Deploy na Vercel (gratuito)

1. Acesse [vercel.com](https://vercel.com) e entre com sua conta GitHub
2. Clique em **Add New → Project**
3. Importe o repositório `vistoria-obra`
4. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_URL` | Mesmo URL acima |
| `SUPABASE_PUBLISHABLE_KEY` | Chave anon/public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Mesma chave acima |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role |

5. Clique em **Deploy**
6. Aguarde o build (~3 min)

## 7. Configurar redirect URL no Supabase

1. No Supabase, vá em **Authentication → URL Configuration**
2. Em **Site URL**, coloque: `https://seu-app.vercel.app`
3. Em **Redirect URLs**, adicione: `https://seu-app.vercel.app/**`

## 8. Testar

1. Acesse `https://seu-app.vercel.app`
2. Você deve ver a tela de login
3. Crie uma conta e teste criar vistorias e formulários
4. Os dados ficarão isolados por usuário

## Domínio personalizado (opcional)

Na Vercel, vá em **Settings → Domains** e adicione seu domínio.
Atualize o **Site URL** no Supabase para o novo domínio.

## Custos

Tudo gratuito nos limites:
- **Supabase Free**: 500 MB banco, 1 GB storage, 50k usuários ativos/mês
- **Vercel Free**: 100 GB bandwidth/mês, builds ilimitados
