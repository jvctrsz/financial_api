# Regras de Negócio — Sistema de Controle Financeiro

> Este documento é a fonte de verdade do projeto. Toda implementação, revisão de código e decisão técnica deve estar alinhada com as regras aqui definidas. Em caso de dúvida, este documento prevalece.

---

## Sumário

1. [Stack e Bibliotecas](#1-stack-e-bibliotecas)
2. [Princípios Gerais](#2-princípios-gerais)
3. [Autenticação e Usuários](#3-autenticação-e-usuários)
4. [Categorias](#4-categorias)
5. [Cartões](#5-cartões)
6. [Salários e Períodos Financeiros](#6-salários-e-períodos-financeiros)
7. [Transações](#7-transações)
8. [Gastos Fixos Parcelados](#8-gastos-fixos-parcelados)
9. [Entradas Mensais](#9-entradas-mensais)
10. [Gastos à Parte](#10-gastos-à-parte)
11. [Relatórios e Cálculo de Saldo](#11-relatórios-e-cálculo-de-saldo)
12. [Testes](#12-testes)
13. [Estrutura de Módulos](#13-estrutura-de-módulos)
14. [Endpoints](#14-endpoints)

---

## 1. Stack e Bibliotecas

| Camada | Tecnologia |
|---|---|
| Framework | NestJS com TypeScript |
| Banco de dados | PostgreSQL |
| ORM | Prisma |
| Autenticação | JWT (access + refresh token) |
| Hash de senha | Argon2 |
| Manipulação de datas | date-fns |
| Testes | Jest + @nestjs/testing |

- Swagger **não** deve ser implementado neste momento.
- O projeto é **multi-usuário** — todo dado é isolado por `userId`. Nenhum endpoint retorna dados de outro usuário.

---

## 2. Princípios Gerais

### Imutabilidade

Os seguintes recursos são **imutáveis** — uma vez criados, não podem ser editados:

- `Salary` (salários)
- `Transaction` (transações)

Esses models **não possuem** `updatedAt`. A ausência do campo é intencional. Endpoints `PATCH` ou `PUT` **não devem existir** para esses recursos. Para corrigir um registro, o usuário deve apagar (soft delete) e criar um novo.

### Soft Delete

Os seguintes recursos usam soft delete via campo `deletedAt`:

- `Transaction`
- `Income`
- `FixedExpense`
- `AsideExpense`

Soft delete significa setar `deletedAt = now()`. O registro **nunca é removido fisicamente** do banco. Toda query de listagem deve incluir o filtro `deletedAt IS NULL` por padrão.

### Isolamento por Usuário
Todo service deve validar que o recurso sendo acessado ou manipulado pertence ao `userId` extraído do JWT. Nunca confiar em `userId` enviado pelo cliente no body da requisição.

---

## 3. Autenticação e Usuários

### Registro
- Email deve ser único no sistema.
- Senha deve ser hasheada com **Argon2** antes de persistir. Nunca salvar plain text.
- Retornar erro claro se email já estiver em uso.

### Login
- Validar email e senha.
- Retornar `accessToken` (JWT, expiração curta — **15 minutos**) no body.
- Retornar `refreshToken` (JWT, expiração longa — **7 dias**) em **httpOnly cookie** — nunca exposto no body.
- Rejeitar com erro genérico se credenciais forem inválidas (não diferenciar "email não existe" de "senha errada" para evitar enumeração de usuários).

### Refresh Token
- Endpoint `POST /auth/refresh` recebe o `refreshToken` via cookie.
- Retorna novo `accessToken` no body.
- Rejeitar token inválido, expirado ou adulterado.

### Preferências do Usuário
- O campo `includeIncomesInBalance` (boolean, default `false`) controla se as entradas mensais entram no cálculo do saldo disponível.
- Esse campo é atualizado via `PATCH /users/me/preferences`.

### Senha
- Atualização de senha deve gerar novo hash Argon2.
- Nunca retornar `passwordHash` em nenhuma resposta da API.

---

## 4. Categorias

### Estrutura
- Categorias formam uma árvore de **dois níveis** usando auto-relação (Adjacency List):
  - **Nível 1 — Categoria raiz:** `parentId = NULL`. Ex: "Alimentação", "Transporte".
  - **Nível 2 — Subcategoria:** `parentId = id da categoria raiz`. Ex: "Mercado", "Gasolina".

### Regras
- **Transações só podem referenciar subcategorias** (`parentId IS NOT NULL`). Nunca uma categoria raiz.
- Não é permitido criar uma subcategoria apontando `parentId` para outra subcategoria. Máximo de 2 níveis.
- Não é permitido deletar uma categoria raiz que possua subcategorias filhas.
- Não é permitido deletar uma subcategoria que possua transações vinculadas (mesmo que soft-deletadas).
- Categorias são por usuário — `parentId` informado deve pertencer ao mesmo `userId`.

### Retorno em listagem
A listagem de categorias deve retornar a árvore aninhada:
```json
[
  {
    "id": "uuid",
    "name": "Alimentação",
    "children": [
      { "id": "uuid", "name": "Mercado" },
      { "id": "uuid", "name": "Lanches" }
    ]
  }
]
```

---

## 5. Cartões

### Campos relevantes
- `closingDay`: dia do mês em que a fatura do cartão **fecha** (valor entre 1 e 31).

### Regra de Fatura (billing)
O dia de fechamento determina a qual fatura uma compra pertence:

```
transaction_date.day <  card.closingDay  →  fatura do mês CORRENTE
transaction_date.day >= card.closingDay  →  fatura do mês SEGUINTE
```

> **Atenção ao operador:** o dia do fechamento (`>=`) já pertence à próxima fatura.

**Exemplos com cartão que fecha dia 06:**
```
Compra em 05/05  →  05 < 06  →  fatura de Maio
Compra em 06/05  →  06 >= 06 →  fatura de Junho
Compra em 07/05  →  07 >= 06 →  fatura de Junho
```

### Restrições
- Não é permitido deletar cartão com transações vinculadas.
- `closingDay` deve ser validado entre 1 e 31.

---

## 6. Salários e Períodos Financeiros

### Conceito de Período Financeiro
O sistema **não trabalha com mês calendário**. A unidade de tempo é o **período financeiro**, definido pela data real de recebimento do salário (`paidAt`).

```
Período Financeiro de Maio/2025:
  início:  07/05/2025  (paid_at deste salário)
  fim:     05/06/2025  (paid_at do próximo salário - 1 dia)
```

### Salário (`Salary`)
- Imutável — sem `updatedAt`, sem endpoint de edição.
- `paidAt` é informado **manualmente** pelo usuário na data em que recebeu.
- Constraint única: `(userId, paidAt)` — não pode haver dois salários no mesmo dia para o mesmo usuário.
- Para "corrigir" um salário, o usuário deve apagar o período e criar um novo (comportamento a definir em versão futura — por ora, não expor delete de salário).

### Período Financeiro (`SalaryPeriod`)
- **Gerado automaticamente** pelo `SalaryService` sempre que um novo `Salary` é inserido.
- O usuário nunca interage diretamente com `SalaryPeriod`.
- Campos:
  - `startedAt` = `salary.paidAt`
  - `endedAt` = `paidAt do próximo salário - 1 dia` (NULL se for o mais recente)
  - `referenceMonth` = primeiro dia do mês de `paidAt` (ex: `2025-05-01`)

**Ao inserir um novo salário, o SalaryService deve:**
1. Criar o registro em `Salary`.
2. Buscar o `SalaryPeriod` mais recente do usuário (onde `endedAt IS NULL`).
3. Atualizar o `endedAt` desse período para `novoSalary.paidAt - 1 dia`.
4. Criar o novo `SalaryPeriod` com `endedAt = NULL`.

### Fallback de Salário
Ao consultar o salário vigente para uma data X:
```sql
SELECT * FROM salaries
WHERE user_id = :userId
  AND paid_at <= :dataX
ORDER BY paid_at DESC
LIMIT 1
```
Se nenhum salário for encontrado, retornar erro indicando que nenhum salário foi cadastrado.

### Comportamento antes do pagamento
Se a data atual for anterior ao `paidAt` do salário do mês corrente (ou seja, o salário ainda não foi registrado), o sistema trata o dia atual como ainda pertencente ao **período anterior**.

---

## 7. Transações

### Imutabilidade
- Transações **não podem ser editadas**. Sem endpoint `PATCH` ou `PUT`.
- Para corrigir: soft delete na transação errada + criação de nova transação.

### Campos calculados automaticamente
O cliente **nunca envia** `billingDate` nem `periodId`. Esses campos são **sempre calculados pelo serviço** na criação.

### Cálculo do `billingDate`

**Para transações de CRÉDITO (cartão):**
```
Se transaction_date.day <  card.closingDay:
  billingDate = 1º dia do mês corrente de transaction_date

Se transaction_date.day >= card.closingDay:
  billingDate = 1º dia do mês seguinte ao de transaction_date
```

**Para DÉBITO e PIX (sem cartão):**
```
billingDate = transaction_date (a própria data da compra)
```

### Cálculo do `periodId`

O `periodId` é resolvido com base na **data âncora**, que difere por tipo:

**Para CRÉDITO:**
```
dataAncora = billingDate (mês da fatura)

Query:
SELECT id FROM salary_periods
WHERE user_id = :userId
  AND reference_month = :dataAncora  -- match exato de mês/ano
```

**Para DÉBITO e PIX:**
```
dataAncora = transaction_date

Query:
SELECT id FROM salary_periods
WHERE user_id = :userId
  AND started_at <= :dataAncora
  AND (ended_at >= :dataAncora OR ended_at IS NULL)
ORDER BY started_at DESC
LIMIT 1
```

### Exemplos de resolução de período

```
Configuração:
  Cartão B fecha dia 06
  Salário de Maio: paidAt = 07/05/2025
  Salário de Junho: paidAt = 06/06/2025

Compra CRÉDITO (Cartão B) em 05/05:
  05 < 06 → billingDate = 01/05/2025
  referenceMonth = 01/05/2025 → period = Maio ✓
  (pago com salário de Maio recebido em 07/05)

Compra CRÉDITO (Cartão B) em 06/05:
  06 >= 06 → billingDate = 01/06/2025
  referenceMonth = 01/06/2025 → period = Junho ✓
  (pago com salário de Junho)

PIX em 06/05:
  dataAncora = 06/05/2025
  06/05 < paidAt de Maio (07/05) → period = Abril ✓
  (ainda não recebi o salário de Maio)

PIX em 07/05:
  dataAncora = 07/05/2025
  07/05 >= paidAt de Maio (07/05) → period = Maio ✓
  (já recebi o salário de Maio)
```

### Período não encontrado
Se nenhum `SalaryPeriod` for encontrado para a data âncora (ex: usuário ainda não cadastrou nenhum salário), o serviço deve retornar erro claro solicitando que o usuário cadastre seu salário antes de registrar transações.

### Validações
- `categoryId` deve referenciar uma **subcategoria** (`parentId IS NOT NULL`).
- `categoryId` deve pertencer ao `userId` autenticado.
- `cardId`, se informado, deve pertencer ao `userId` autenticado.
- `type` deve ser `CREDIT`, `DEBIT` ou `PIX`.
- Se `type = CREDIT`, `cardId` é **obrigatório**.
- Se `type = DEBIT` ou `PIX`, `cardId` deve ser **nulo**.

---

## 8. Gastos Fixos Parcelados

### Criação
Ao criar um `FixedExpense`, o `FixedExpenseService` deve **automaticamente gerar todas as parcelas** como `Transaction` individuais, calculando `billingDate` e `periodId` para cada uma.

**Algoritmo de geração de parcelas:**
```
Para i de 0 até totalInstallments - 1:
  Se tem cardId:
    baseDate = startMonth + i meses
    Aplicar regra de billingDate do cartão sobre baseDate
  Senão:
    billingDate = startMonth + i meses (1º dia)

  Calcular periodId a partir do billingDate (regra de crédito)

  Criar Transaction com:
    fixedExpenseId = fixedExpense.id
    billingDate    = calculado
    periodId       = calculado
    amount         = installmentAmount
    description    = "{description} — Parcela {i+1}/{totalInstallments}"
```

### Validações
- `installmentAmount * totalInstallments` deve ser igual a `totalAmount`. Rejeitar se divergir (ou calcular automaticamente um dos dois — definir na implementação).
- `startMonth` deve ser sempre o primeiro dia do mês (ex: `2025-05-01`).
- `categoryId` deve ser subcategoria do `userId`.

### Soft Delete em Cascata
Ao fazer soft delete em um `FixedExpense`:
1. Setar `deletedAt` no `FixedExpense`.
2. Buscar todas as `Transaction` vinculadas (`fixedExpenseId = id`) onde `billingDate >= hoje` e `deletedAt IS NULL`.
3. Setar `deletedAt = now()` nessas transações futuras.
4. **Não tocar** nas transações passadas (`billingDate < hoje`) — elas são histórico imutável.

---

## 9. Entradas Mensais

- Entradas mensais representam receitas extras (freelance, aluguel recebido, etc.).
- **Não entram no cálculo de saldo por padrão.**
- Só são incluídas no cálculo quando `User.includeIncomesInBalance = true`.
- O campo `month` armazena sempre o primeiro dia do mês de referência (ex: `2025-05-01`).
- Soft delete via `deletedAt`.

---

## 10. Gastos à Parte

- Valores que **não são transações**, mas impactam o saldo disponível.
- Exemplos: reserva de emergência, poupança mensal, separar dinheiro para evento futuro.
- `recurrent = true`: aplica em todos os meses a partir de `startMonth` até `endMonth` (ou indefinidamente se `endMonth = null`).
- `recurrent = false`: aplica apenas no mês de `startMonth`.
- Soft delete via `deletedAt`.

**Lógica de aplicação no cálculo:**
```
Um AsideExpense é ativo em um período P se:
  recurrent = false → startMonth = referenceMonth do período P
  recurrent = true  → startMonth <= referenceMonth do período P
                      AND (endMonth IS NULL OR endMonth >= referenceMonth do período P)
```

---

## 11. Relatórios e Cálculo de Saldo

### Fórmula do Saldo Disponível
```
Saldo Disponível do Período P =
    Salary.amount (do período P)
  + SUM(incomes do período P)        [somente se includeIncomesInBalance = true]
  - SUM(transactions do período P onde deletedAt IS NULL)
  - SUM(asideExpenses ativos no período P onde deletedAt IS NULL)
```

### Visões disponíveis

**Por Período Financeiro (`/reports/period/:periodId`):**
Agrupa tudo pelo `periodId` das transações. Responde: "Com este salário, quanto gastei e quanto me sobra?"

**Por Fatura (`/reports/billing?month=2025-05`):**
Agrupa pelo `billingDate` das transações. Responde: "O que está na fatura de Maio do meu cartão?"

### Agrupamento por Categoria
No relatório por período, os gastos devem ser agrupados por categoria raiz, com detalhamento por subcategoria:
```json
{
  "byCategory": [
    {
      "category": "Alimentação",
      "total": 850.00,
      "children": [
        { "subcategory": "Mercado", "total": 600.00 },
        { "subcategory": "Lanches", "total": 250.00 }
      ]
    }
  ]
}
```

---

## 12. Testes

Todos os módulos com regras de negócio devem ter testes unitários no service. Os casos críticos estão listados abaixo.

### Prioridade Alta — Implementar antes do código

**`SalaryService`**
- Deve criar salário e gerar SalaryPeriod automaticamente.
- Deve atualizar `endedAt` do período anterior ao inserir novo salário.
- Deve rejeitar dois salários no mesmo dia para o mesmo usuário.
- Deve retornar salário vigente via fallback (último `paidAt <= dataConsultada`).
- Deve retornar erro se nenhum salário cadastrado.

**`TransactionService` — regra de `billingDate`**
- CRÉDITO, dia < closingDay → billingDate = 1º dia do mês corrente.
- CRÉDITO, dia >= closingDay → billingDate = 1º dia do mês seguinte.
- CRÉDITO, closingDay = 1, compra dia 1 → billingDate = 1º dia do mês seguinte.
- CRÉDITO, closingDay = 31, compra dia 31 → billingDate = 1º dia do mês seguinte.
- DÉBITO/PIX → billingDate = transaction_date.
- Mês com 31 dias, compra dia 30, closingDay = 30 → billingDate = mês seguinte.

**`TransactionService` — regra de `periodId`**
- CRÉDITO: deve buscar período por `referenceMonth` do `billingDate`.
- DÉBITO/PIX: compra no dia do pagamento → período atual.
- DÉBITO/PIX: compra no dia anterior ao pagamento → período anterior.
- Deve retornar erro se nenhum período encontrado.

**`FixedExpenseService`**
- Deve gerar exatamente `totalInstallments` transações ao criar.
- Cada parcela deve ter `billingDate` e `periodId` corretos.
- Soft delete deve apagar parcelas futuras e preservar passadas.
- Deve rejeitar se período não existir para parcelas futuras (gerar com aviso ou rejeitar — definir na implementação).

**`ReportService`**
- Saldo sem flag de entradas: não soma incomes.
- Saldo com flag ativa: soma incomes.
- Período sem transações: saldo = salário - asideExpenses.
- Período sem salário próprio: usa fallback do último salário.
- AsideExpense recorrente deve aparecer em todos os períodos dentro do intervalo.
- AsideExpense não recorrente deve aparecer apenas no mês exato.
- `GET /reports/balance` deve retornar saldo do período atual sem parâmetros.
- `GET /reports/balance` deve retornar erro se nenhum período existir.

### Prioridade Normal

**`AuthService`**
- Deve criar usuário com hash Argon2 (nunca plain text).
- Deve rejeitar registro com email duplicado.
- Deve retornar tokens válidos no login.
- Deve rejeitar credenciais inválidas com erro genérico.
- Deve rejeitar refresh token inválido ou expirado.

**`CategoryService`**
- Deve criar categoria raiz e subcategoria.
- Deve rejeitar subcategoria apontando para outra subcategoria.
- Deve rejeitar `parentId` de outro usuário.
- Deve rejeitar delete de raiz com filhos.
- Deve rejeitar delete de subcategoria com transações.
- Deve retornar árvore aninhada corretamente.

**`CardService`**
- Deve rejeitar `closingDay` fora de 1–31.
- Deve rejeitar delete com transações vinculadas.
- Não deve retornar cartões de outros usuários.

---

## 13. Estrutura de Módulos

```
src/
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.controller.spec.ts
│   ├── auth.service.ts
│   ├── auth.service.spec.ts
│   ├── strategies/
│   │   ├── jwt.strategy.ts
│   │   └── jwt-refresh.strategy.ts
│   ├── guards/
│   │   ├── jwt.guard.ts
│   │   └── jwt-refresh.guard.ts
│   └── dto/
│       ├── register.dto.ts
│       └── login.dto.ts
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.controller.spec.ts
│   ├── users.service.ts
│   ├── users.service.spec.ts
│   └── dto/
│       ├── update-user.dto.ts
│       └── update-preferences.dto.ts
├── categories/
│   ├── categories.module.ts
│   ├── categories.controller.ts
│   ├── categories.controller.spec.ts
│   ├── categories.service.ts
│   ├── categories.service.spec.ts
│   └── dto/
│       └── create-category.dto.ts
├── cards/
│   ├── cards.module.ts
│   ├── cards.controller.ts
│   ├── cards.controller.spec.ts
│   ├── cards.service.ts
│   ├── cards.service.spec.ts
│   └── dto/
│       ├── create-card.dto.ts
│       └── update-card.dto.ts
├── salaries/
│   ├── salaries.module.ts
│   ├── salaries.controller.ts
│   ├── salaries.controller.spec.ts
│   ├── salaries.service.ts
│   ├── salaries.service.spec.ts
│   └── dto/
│       └── create-salary.dto.ts
├── incomes/
│   ├── incomes.module.ts
│   ├── incomes.controller.ts
│   ├── incomes.controller.spec.ts
│   ├── incomes.service.ts
│   ├── incomes.service.spec.ts
│   └── dto/
│       └── create-income.dto.ts
├── transactions/
│   ├── transactions.module.ts
│   ├── transactions.controller.ts
│   ├── transactions.controller.spec.ts
│   ├── transactions.service.ts
│   ├── transactions.service.spec.ts
│   └── dto/
│       └── create-transaction.dto.ts
├── fixed-expenses/
│   ├── fixed-expenses.module.ts
│   ├── fixed-expenses.controller.ts
│   ├── fixed-expenses.controller.spec.ts
│   ├── fixed-expenses.service.ts
│   ├── fixed-expenses.service.spec.ts
│   └── dto/
│       └── create-fixed-expense.dto.ts
├── aside-expenses/
│   ├── aside-expenses.module.ts
│   ├── aside-expenses.controller.ts
│   ├── aside-expenses.controller.spec.ts
│   ├── aside-expenses.service.ts
│   ├── aside-expenses.service.spec.ts
│   └── dto/
│       └── create-aside-expense.dto.ts
├── reports/
│   ├── reports.module.ts
│   ├── reports.controller.ts
│   ├── reports.controller.spec.ts
│   ├── reports.service.ts
│   └── reports.service.spec.ts
└── app.module.ts
```

---

## 14. Endpoints

Todos os endpoints abaixo (exceto `auth`) exigem JWT válido via Guard.
O `userId` é sempre extraído do token — nunca do body da requisição.

### Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cria conta |
| POST | `/auth/login` | Retorna accessToken (body) + refreshToken (cookie) |
| POST | `/auth/refresh` | Renova accessToken via refreshToken (cookie) |

### Users
| Método | Rota | Descrição |
|---|---|---|
| GET | `/users/me` | Retorna perfil (sem passwordHash) |
| PATCH | `/users/me` | Atualiza nome, email ou senha |
| PATCH | `/users/me/preferences` | Atualiza `includeIncomesInBalance` |

### Categories
| Método | Rota | Descrição |
|---|---|---|
| POST | `/categories` | Cria categoria ou subcategoria |
| GET | `/categories` | Lista árvore aninhada do usuário |
| DELETE | `/categories/:id` | Remove categoria (hard delete, com validações) |

### Cards
| Método | Rota | Descrição |
|---|---|---|
| POST | `/cards` | Cria cartão |
| GET | `/cards` | Lista cartões do usuário |
| PATCH | `/cards/:id` | Atualiza nome ou closingDay |
| DELETE | `/cards/:id` | Remove cartão (hard delete, com validações) |

### Salaries
| Método | Rota | Descrição |
|---|---|---|
| POST | `/salaries` | Registra salário e gera período financeiro |
| GET | `/salaries` | Lista histórico de salários |
| GET | `/salaries/current` | Retorna salário vigente hoje |

### Incomes
| Método | Rota | Descrição |
|---|---|---|
| POST | `/incomes` | Registra entrada mensal |
| GET | `/incomes?month=2025-05` | Lista entradas de um mês |
| DELETE | `/incomes/:id` | Soft delete |

### Transactions
| Método | Rota | Descrição |
|---|---|---|
| POST | `/transactions` | Registra gasto (billingDate e periodId calculados) |
| GET | `/transactions?periodId=uuid` | Lista por período financeiro |
| GET | `/transactions?billingMonth=2025-05` | Lista por fatura do cartão |
| DELETE | `/transactions/:id` | Soft delete |

### Fixed Expenses
| Método | Rota | Descrição |
|---|---|---|
| POST | `/fixed-expenses` | Cria gasto fixo e gera todas as parcelas |
| GET | `/fixed-expenses` | Lista gastos fixos ativos |
| DELETE | `/fixed-expenses/:id` | Soft delete + soft delete em parcelas futuras |

### Aside Expenses
| Método | Rota | Descrição |
|---|---|---|
| POST | `/aside-expenses` | Cria gasto à parte |
| GET | `/aside-expenses` | Lista ativos |
| DELETE | `/aside-expenses/:id` | Soft delete |

### Reports
| Método | Rota | Descrição |
|---|---|---|
| GET | `/reports/balance` | Saldo disponível do período atual |
| GET | `/reports/period/:periodId` | Resumo completo do período financeiro |
| GET | `/reports/billing?month=2025-05` | Visão por fatura de cartão |

**`GET /reports/balance` — detalhamento:**
- Não recebe parâmetros.
- Identifica o período atual buscando o `SalaryPeriod` onde `startedAt <= hoje` e `endedAt IS NULL` (ou `endedAt >= hoje`).
- Calcula o saldo disponível conforme a fórmula da seção 11.
- Retorna apenas o número final e a identificação do período:
```json
{
  "available": 1850.00,
  "periodId": "uuid",
  "periodStart": "2025-05-07",
  "periodEnd": null
}
```
- `periodId` é retornado para permitir navegação ao relatório completo via `GET /reports/period/:periodId`.
- Se nenhum período existir (usuário sem salário cadastrado), retornar erro orientando o cadastro do salário.
