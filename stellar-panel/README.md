# Painel Stellar — Assistente Operacional

Painel web interno para gerenciamento de agenda, cronograma, reuniões e comunicação do Stellar.

---

## O que o painel faz

- Lê a planilha de cronograma do Stellar (aba "cronograma geral")
- Sincroniza com Google Calendar pessoal (apenas leitura, para evitar conflitos)
- Sincroniza com o calendário "stellar" (leitura + criação de eventos)
- Lê Google Tasks relevantes (com estrela, vencidas, relacionadas ao Stellar)
- Gera relatório mensal em HTML e PDF
- Sugere calendário de reuniões para o próximo mês com base nas regras definidas
- Prepara automaticamente agenda e ata inicial de cada reunião
- Permite aprovar eventos antes de criar no Google Calendar
- Integra com WhatsApp Web para envio assistido de relatórios
- Salva preferências de horário e regras de reunião

---

## Pré-requisitos

- Node.js 18 ou superior
- Conta Google com acesso à planilha e calendários
- Projeto no Google Cloud Console com OAuth 2.0 configurado

---

## Instalação

### 1. Instale as dependências

```bash
cd stellar-panel
npm install
```

### 2. Configure as credenciais Google

#### Passo a passo no Google Cloud Console:

1. Acesse: https://console.cloud.google.com
2. Crie um novo projeto ou selecione um existente
3. Vá em **APIs e serviços > Biblioteca**
4. Ative as seguintes APIs:
   - Google Sheets API
   - Google Calendar API
   - Google Tasks API
5. Vá em **APIs e serviços > Credenciais**
6. Clique em **Criar credenciais > ID do cliente OAuth**
7. Tipo de aplicativo: **Aplicativo da Web**
8. URIs de redirecionamento autorizados: `http://localhost:3000/api/auth/callback`
9. Copie o **Client ID** e o **Client Secret**

### 3. Crie o arquivo .env.local

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:

```
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
SPREADSHEET_ID=172iH5tzSCgSE0Ss5bLrFnhmMxZqQoJuOkIYaymG5P3E
SHEET_NAME=cronograma geral
NEXTAUTH_SECRET=qualquer_string_aleatoria
NEXTAUTH_URL=http://localhost:3000
```

### 4. Crie o calendário "stellar" no Google Calendar

1. Acesse https://calendar.google.com
2. No painel esquerdo, clique em **+ Outros calendários > Criar calendário**
3. Nome: `stellar` (exatamente assim, em minúsculo)
4. Clique em **Criar calendário**

### 5. Inicie o servidor

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## Fluxo de uso

### Primeira vez

1. Clique em **Conectar com Google**
2. Autorize o acesso (Sheets, Calendar, Tasks)
3. Você será redirecionado de volta ao painel

### Uso diário

1. **Dashboard** — visão geral do mês, atrasos e prioridades
2. **Reuniões** — gere sugestões de reunião para o próximo mês
3. **Aprovação** — revise e aprove eventos antes de criar no Calendar
4. **Relatório** — gere o relatório mensal em HTML ou exporte em PDF
5. **WhatsApp** — prepare e envie o relatório via WhatsApp Web
6. **Preferências** — atualize regras de horário e disponibilidade

---

## Regras de agenda configuradas

### Indisponibilidade da Roberta
- Segunda-feira 19h–22h30 (pós-graduação)
- Terça-feira 19h–22h30 (pós-graduação)

### Preferências de Júlia e Maria
- Reuniões à noite, segunda a quinta
- Horários preferenciais: 20h ou 21h

### Outras janelas
- Sexta 17h
- Domingo 18h

### Guilherme Nasser
- Reunião semanal
- Preferência: meio ou final da tarde (14h–17h)

### Consultoria Genesis
- 4 horas por mês (4 reuniões de 1h)
- Preferência: 8h ou 9h
- Algumas não precisam de invite

---

## Tipos de reuniões geradas

| Tipo | Frequência | Participantes |
|------|-----------|---------------|
| Júlia + Roberta | Semanal | Júlia, Roberta |
| Maria + Roberta | Semanal | Maria, Roberta |
| Sócias Stellar | Quinzenal | Júlia, Maria, Roberta |
| Guilherme Nasser | Semanal | Guilherme, Roberta |
| Consultoria Genesis | 4x/mês | Roberta |
| Extra (semanas críticas) | Conforme necessário | Todas as sócias |

---

## WhatsApp Web

O envio via WhatsApp é em **modo assistido**:

1. Ao clicar em enviar, abre o Chrome com WhatsApp Web
2. Na primeira vez, escaneie o QR Code
3. A sessão é salva em `data/whatsapp-session/` para não precisar escanear sempre
4. O envio acontece automaticamente para os contatos aprovados

Destinatários possíveis:
- Júlia
- Maria
- Guilherme Nasser
- Grupo Sócias Stellar

---

## Estrutura de arquivos

```
stellar-panel/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard
│   │   ├── relatorio/            # Relatório mensal
│   │   ├── reunioes/             # Sugestão de reuniões
│   │   ├── aprovacao/            # Painel de aprovação
│   │   ├── whatsapp/             # WhatsApp assistido
│   │   ├── logs/                 # Histórico de ações
│   │   ├── preferencias/         # Configurações
│   │   └── api/                  # Rotas de API
│   ├── components/               # Componentes React
│   ├── lib/
│   │   ├── google/               # Integrações Google
│   │   ├── meetings/             # Motor de sugestões
│   │   ├── report/               # Gerador de relatório
│   │   └── whatsapp/             # Automação WhatsApp
│   └── types/                    # Tipos TypeScript
├── data/
│   ├── preferences.json          # Preferências (editável)
│   ├── tokens.json               # Tokens OAuth (gerado automaticamente, NÃO commitar)
│   └── sugestoes.json            # Sugestões salvas
├── logs/
│   └── envios.json               # Log de ações
├── reports/                      # Relatórios gerados (HTML e PDF)
├── .env.example                  # Modelo de variáveis
└── README.md
```

---

## Segurança

- Os tokens OAuth são salvos localmente em `data/tokens.json` (não commitar)
- Nunca commite o arquivo `.env.local`
- O painel roda apenas localmente (não é um serviço público)
- O `data/whatsapp-session/` contém a sessão do WhatsApp (não commitar)

---

## Dependências principais

| Pacote | Para que serve |
|--------|---------------|
| next | Framework web React |
| googleapis | Acesso às APIs do Google |
| puppeteer | Geração de PDF e automação WhatsApp Web |
| date-fns | Manipulação de datas |
| tailwindcss | Estilização |
| lucide-react | Ícones |
| react-hot-toast | Notificações |

---

## Solução de problemas

**"Calendário stellar não encontrado"**
Crie um calendário chamado exatamente `stellar` no Google Calendar.

**"NÃO_AUTENTICADO"**
Clique em "Conectar com Google" no painel inicial.

**PDF não gera**
Puppeteer precisa do Chrome instalado. Rode `npm install` para instalar automaticamente.

**WhatsApp não abre**
Verifique se o Chrome está instalado. O Puppeteer usa o Chromium incluído no pacote.

**Planilha retorna vazio**
Confirme que o `SPREADSHEET_ID` está correto e que a aba se chama exatamente "cronograma geral".
