# Financial API

Projeto pessoal em desenvolvimento.

> Projeto de aprendizado em back-end com Nest.js. O projeto foi conduzido por mim, desde a definição das regras de negócio até a revisão das decisões técnicas, utilizando agentes de IA como apoio no planejamento, estudo e implementação.

API REST de controle financeiro pessoal desenvolvida com Nest.js, TypeScript, PostgreSQL e Prisma.

## Sobre o projeto

A Financial API é uma aplicação criada para praticar a construção de uma API back-end com autenticação, banco relacional, organização modular e regras de negócio financeiras.

A aplicação permite organizar salários, períodos financeiros, cartões, categorias, transações, entradas mensais, gastos fixos, gastos parcelados, gastos à parte e relatórios de saldo.

O objetivo principal do projeto é estudar, na prática, conceitos como:

* Estrutura modular com Nest.js
* Autenticação com access token e refresh token
* Integração com PostgreSQL usando Prisma
* Regras de negócio com múltiplas entidades
* Isolamento de dados por usuário autenticado
* Soft delete em registros financeiros
* Cálculo de saldo por período financeiro
* Separação entre controllers, DTOs e services
* Testes automatizados para regras de negócio

## Tecnologias utilizadas

* Nest.js
* TypeScript
* PostgreSQL
* Prisma ORM
* Docker
* JWT
* Passport
* Argon2
* Cookie Parser
* Class Validator
* Class Transformer
* date-fns
* Jest

## Funcionalidades

### Autenticação

* Cadastro de usuário
* Login com access token JWT
* Refresh token via cookie httpOnly
* Rotação de refresh token
* Logout da sessão atual
* Hash de senha com Argon2
* Rotas protegidas por autenticação

### Usuários

* Consulta dos dados do usuário autenticado
* Atualização de dados do usuário
* Isolamento dos dados por usuário autenticado

### Categorias

* Criação de categorias raiz
* Criação de subcategorias
* Listagem em formato de árvore
* Soft delete de categorias
* Validações para impedir remoção indevida de categorias em uso

### Cartões

* Cadastro de cartões
* Definição de cartão padrão
* Validação de dia de fechamento da fatura
* Listagem dos cartões do usuário
* Remoção de cartão com validações

### Salários e períodos financeiros

* Cadastro de salários
* Geração automática de períodos financeiros
* Fechamento automático do período anterior ao cadastrar novo salário
* Consulta de salário vigente
* Remoção controlada do salário mais recente para correção de cadastro

### Transações

* Cadastro de transações de crédito, débito e PIX
* Cálculo automático de `billingDate`
* Cálculo automático de `periodId`
* Soft delete de transações
* Validação de categoria, cartão e usuário
* Marcação de pagamento para ocorrências específicas de gastos fixos

### Entradas mensais

* Cadastro de entradas extras
* Controle individual para definir se a entrada impacta ou não o saldo
* Listagem por mês
* Soft delete

### Gastos fixos

* Cadastro de gastos recorrentes
* Geração de transações para o período financeiro
* Controle de pagamento para gastos fixos via PIX ou débito
* Soft delete com preservação do histórico

### Gastos parcelados

* Cadastro de gastos parcelados
* Geração automática das parcelas como transações
* Vínculo com períodos financeiros quando disponíveis
* Soft delete preservando histórico passado

### Gastos à parte

* Cadastro de reservas ou separações de dinheiro
* Suporte a gastos recorrentes e não recorrentes
* Finalização de recorrência
* Impacto direto no cálculo de saldo

### Relatórios

* Consulta de saldo disponível do período atual
* Relatório completo por período financeiro
* Relatório por fatura de cartão
* Agrupamento de gastos por categoria e subcategoria

## Regras de negócio importantes

O sistema não trabalha apenas com mês calendário. A principal unidade de controle é o período financeiro, definido a partir da data real de recebimento do salário.

Exemplo:

```txt
Salário recebido em 07/05
Próximo salário recebido em 06/06

Período financeiro:
07/05 até 05/06
```

O saldo disponível considera:

```txt
Saldo disponível =
  salário do período
  + entradas incluídas no saldo
  - transações do período
  - gastos à parte ativos no período
```

Outras decisões importantes:

* O sistema é multiusuário.
* Dados financeiros são sempre isolados por usuário autenticado.
* Transações usam soft delete.
* Entradas usam soft delete.
* Gastos fixos, parcelados e à parte usam soft delete.
* Salários e transações comuns são tratados como registros imutáveis.
* Para corrigir uma transação, o usuário deve removê-la e criar uma nova.
* O refresh token é armazenado no banco apenas como hash.
* O logout revoga apenas a sessão atual.
* Entradas mensais não impactam o saldo por padrão.

## Estrutura do projeto

```txt
src/
  auth/
  users/
  categories/
  cards/
  salaries/
  transactions/
  incomes/
  fixed-expenses/
  installment-expenses/
  aside-expenses/
  reports/
  prisma/
  shared/
```

## Como rodar localmente

Clone o repositório:

```bash
git clone https://github.com/jvctrsz/financial_api.git
```

Acesse a pasta do projeto:

```bash
cd financial_api
```

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env` na raiz do projeto:

```env
POSTGRES_USER=financial
POSTGRES_PASSWORD=financial
POSTGRES_DB=financial_api
POSTGRES_PORT=5432

DATABASE_URL=postgresql://financial:financial@localhost:5432/financial_api?schema=public

JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

FRONTEND_URL=http://localhost:5173
```

Essas variáveis são usadas tanto pela aplicação quanto pelo ambiente local com Docker Compose.

> Em ambiente de produção, os valores de `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, usuário, senha e URL do banco devem ser alterados para valores seguros. Os dados acima são apenas exemplos para ambiente local.

Suba o banco de dados com Docker:

```bash
docker compose up -d
```

Execute as migrations do Prisma:

```bash
npx prisma migrate dev
```

Inicie o servidor de desenvolvimento:

```bash
npm run start:dev
```

Execute os testes:

```bash
npm run test
```

## Endpoints principais

### Auth

```txt
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

### Users

```txt
GET   /users/me
PATCH /users/me
```

### Categories

```txt
POST   /categories
GET    /categories
DELETE /categories/:id
```

### Cards

```txt
POST   /cards
GET    /cards
PATCH  /cards/:id
PATCH  /cards/default/:id
DELETE /cards/:id
```

### Salaries

```txt
POST   /salaries
GET    /salaries
GET    /salaries/current
DELETE /salaries/:id
```

### Transactions

```txt
POST   /transactions
GET    /transactions
DELETE /transactions/:id
PATCH  /transactions/:id/pay
```

### Incomes

```txt
POST   /incomes
GET    /incomes
DELETE /incomes/:id
```

### Fixed Expenses

```txt
POST   /fixed-expenses
GET    /fixed-expenses
DELETE /fixed-expenses/:id
```

### Installment Expenses

```txt
POST   /installment-expenses
GET    /installment-expenses
DELETE /installment-expenses/:id
```

### Aside Expenses

```txt
POST   /aside-expenses
GET    /aside-expenses
DELETE /aside-expenses/:id
PATCH  /aside-expenses/:id/finish
```

### Reports

```txt
GET /reports/balance
GET /reports/period/:periodId
GET /reports/billing?month=2025-05
```

## Status do projeto

Este é meu primeiro projeto back-end com Nest.js. O foco tem sido entender, na prática, fundamentos de arquitetura, autenticação, modelagem de dados e regras de negócio financeiras.

A API já possui módulos principais estruturados, autenticação, persistência com Prisma e regras de negócio financeiras implementadas em diferentes partes do sistema.

Ainda há pontos planejados para evolução, como:

* Melhorar testes
* Implementar rate limiting
* Implementar idempotência em rotas de criação
* Criar uma interface web para consumir a API
* Estudar uso de Redis para cache, rate limiting ou filas
* Melhorar a documentação dos endpoints

## Aprendizados

Este projeto tem sido uma forma prática de aprofundar meus conhecimentos em back-end com Nest.js.

Durante o desenvolvimento, estudei e apliquei conceitos como JWT, refresh token, cookies httpOnly, Prisma, PostgreSQL, Docker, validação com DTOs, separação de responsabilidades, organização modular e regras de negócio financeiras.

Também utilizei agentes de IA como apoio no processo de estudo e implementação, sempre revisando as decisões, ajustando regras e buscando entender a estrutura do projeto.

## Autor

Desenvolvido por [João Victor Matias](https://github.com/jvctrsz).

* [LinkedIn](https://www.linkedin.com/in/jvctrsz)
* [E-mail](mailto:jvictor26dev@gmail.com)
