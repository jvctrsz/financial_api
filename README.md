# Financial API

API multiusuário para controle financeiro pessoal, construída com NestJS, TypeScript,
Prisma e PostgreSQL.

O sistema organiza os gastos por **períodos financeiros iniciados na data real de
recebimento do salário**, em vez de assumir meses-calendário. Compras no cartão mantêm
separados o período cujo saldo foi comprometido (`periodId`) e o mês da fatura
(`billingDate`).

## Funcionalidades

- autenticação JWT com access token e refresh token persistido, rotativo e revogável;
- perfil de usuário;
- salários e períodos financeiros;
- categorias em dois níveis e cartão padrão;
- transações de crédito, débito e PIX;
- gastos parcelados retroativos no cartão ou boleto, reconstruídos desde a data real da compra;
- gastos fixos recorrentes gerados pelo dia mensal de cobrança (`chargeDay`);
- entradas mensais e reservas (`AsideExpense`);
- relatórios de saldo, período financeiro e fatura;
- rate limiting por usuário/IP e tipo de rota.

As regras de negócio completas estão em [RULES.md](./RULES.md). O contrato das rotas,
com exemplos de requests e responses, está em [.agents/ROTAS.md](./.agents/ROTAS.md).

## Stack

- Node.js 24 no container oficial do projeto;
- NestJS 11 e TypeScript;
- PostgreSQL 16;
- Prisma 7 com adapter PostgreSQL;
- JWT, Passport e Argon2;
- Jest;
- `date-fns` para datas.

## Configuração

Instale as dependências:

```bash
npm install
```

Crie `.env` a partir de `.env.example` e substitua os segredos de exemplo:

```bash
cp .env.example .env
```

Variáveis presentes no exemplo de ambiente:

| Variável | Finalidade |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL usada pelo Prisma |
| `POSTGRES_USER` | Usuário do container PostgreSQL |
| `POSTGRES_PASSWORD` | Senha do container PostgreSQL |
| `POSTGRES_DB` | Banco criado pelo container |
| `POSTGRES_PORT` | Referência para uso local; atualmente não é consumida pelo Compose nem pela API |
| `JWT_ACCESS_SECRET` | Assinatura do access token |
| `JWT_REFRESH_SECRET` | Assinatura do refresh token |
| `JWT_ACCESS_EXPIRES_IN` | Validade do access token; padrão `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Validade do JWT de refresh; padrão `7d`. O registro no banco expira em 7 dias |
| `FRONTEND_URL` | Origem explícita permitida pelo CORS |
| `PORT` | Porta HTTP da API; padrão `3000` |

## Banco de dados

Com PostgreSQL disponível e `DATABASE_URL` configurada:

```bash
npx prisma generate
npx prisma migrate deploy
```

Para desenvolvimento de novas migrations, use `prisma migrate dev` somente em um banco
de desenvolvimento.

## Executando localmente

```bash
# desenvolvimento com watch
npm run dev

# execução simples
npm run start

# build e execução da saída compilada
npm run build
npm run start:prod
```

A porta padrão é `3000`.

## Docker Compose

O Compose sobe a API e o PostgreSQL 16. Para uso dentro do Compose, `DATABASE_URL` deve
apontar para o hostname `postgres`:

```env
DATABASE_URL=postgresql://financial:financial@postgres:5432/financial_api?schema=public
```

Suba os serviços:

```bash
docker compose up --build
```

A API fica disponível em `http://localhost:5000` no host. Aplique migrations no
container com:

```bash
docker compose exec api npx prisma migrate deploy
```

## Testes e qualidade

```bash
# testes unitários
npm test -- --runInBand

# build/typecheck do Nest
npm run build

# validação do schema Prisma
npx prisma validate
```

A suíte unitária atual possui 57 suites e 317 testes. O arquivo
`test/app.e2e-spec.ts` ainda é o teste de exemplo do starter NestJS e espera uma rota
`GET /` inexistente; portanto, `npm run test:e2e` não representa o contrato atual e
permanece pendente de substituição por cenários E2E reais.

O script `npm run lint` executa ESLint com `--fix` e pode modificar arquivos.

## Rate limiting

Todos os limites usam janela de 60 segundos:

- fallback global: 100 requests;
- leituras decoradas: 300 requests;
- escritas decoradas: 30 requests;
- login e refresh: 10 requests por IP.

O armazenamento do rate limiting é local e em memória. Isso é adequado para uma única
instância, mas os contadores não são compartilhados entre réplicas ou invocações
serverless.

## Estrutura

```text
api/                 entrypoint serverless da Vercel
prisma/              schema e migrations
scripts/             utilitários de desenvolvimento
src/
  auth/              autenticação e sessões
  salaries/          salários e períodos financeiros
  transactions/      transações e vínculo de parcelas
  installment-expenses/
  fixed-expenses/
  incomes/
  aside-expenses/
  categories/
  cards/
  reports/
  shared/            helpers, constantes e guards transversais
test/                 testes E2E
```

Cada módulo separa controllers, DTOs e um service por caso de uso. Toda rota protegida
obtém `userId` exclusivamente do JWT.

## Deploy

O repositório possui dois formatos de execução:

- container persistente, usando `dockerfile` e `docker-compose.yml`;
- função serverless na Vercel, usando `api/index.ts` e `vercel.json`.

Antes de usar múltiplas instâncias ou serverless em produção, o armazenamento em memória
do rate limiting deve ser revisto para um backend compartilhado.

## Processo de desenvolvimento

Antes de implementar mudanças, leia nesta ordem:

1. [RULES.md](./RULES.md), fonte de verdade das regras de negócio;
2. [.agents/Controll/TODO.md](./.agents/Controll/TODO.md), escopo ativo quando o
   documento não estiver marcado como concluído;
3. [.agents/AGENT_RULES.md](./.agents/AGENT_RULES.md), padrões de implementação;
4. [.agents/ROTAS.md](./.agents/ROTAS.md), contrato consumido pelo frontend.

Ao concluir uma tarefa do TODO, marque-a como concluída e registre o resultado em
`.agents/Controll/FINISHED.md`.
