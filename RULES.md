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

| Camada               | Tecnologia                   |
| -------------------- | ---------------------------- |
| Framework            | NestJS com TypeScript        |
| Banco de dados       | PostgreSQL                   |
| ORM                  | Prisma                       |
| Autenticação         | JWT (access + refresh token) |
| Hash de senha        | Argon2                       |
| Manipulação de datas | date-fns                     |
| Testes               | Jest + @nestjs/testing       |

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
- `Category` (raiz e subcategoria) — ver seção 4

Soft delete significa setar `deletedAt = now()`. O registro **nunca é removido fisicamente** do banco. Toda query de listagem deve incluir o filtro `deletedAt IS NULL` por padrão.

### Isolamento por Usuário

Todo service deve validar que o recurso sendo acessado ou manipulado pertence ao `userId` extraído do JWT. Nunca confiar em `userId` enviado pelo cliente no body da requisição.

### Identificadores

Todos os models devem usar UUID v7 como identificador primário. No Prisma, campos `id` devem seguir o padrão:

```prisma
id String @id @default(uuid(7)) @db.Uuid
```

Campos de relacionamento que apontam para esses identificadores devem permanecer como `String @db.Uuid`. Não usar `uuid()` sem versão, `cuid`, `ulid`, IDs incrementais ou geração manual de IDs na aplicação para chaves primárias.

### Helpers e Injeção entre Módulos

Decisão de arquitetura para evitar duplicação de lógica:

- **Helpers** — lógica pura de cálculo, sem acesso a banco, sem dependências de outros serviços. Vivem em `src/shared/helpers/`. Exemplos: cálculo de `billingDate`, cálculo de `referenceMonth`, transformações de data.
- **Injeção entre módulos** — quando o caso de uso envolve banco ou regra de negócio de outro módulo. Exemplos: `CreateTransactionService` injetado no `FixedExpenseService`, `LinkOrphanInstallmentsService` injetado no `CreateSalaryService`.

> **Regra prática:** se precisa de banco ou de regra de negócio de outro módulo, injeta. Se é lógica pura de cálculo, vira helper.

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

- O campo `includeIncomesInBalance` foi **removido** do model `User`. O controle de se uma entrada impacta o saldo é feito individualmente em cada `Income` via campo `includeInBalance` — ver seção 9.
- O endpoint `PATCH /users/me/preferences` foi **removido**. Não há mais preferências globais relacionadas a entradas.

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
- Categorias são por usuário — `parentId` informado deve pertencer ao mesmo `userId`.
- Categorias usam **soft delete** via campo `deletedAt` — nunca são removidas fisicamente do banco.
- Toda listagem filtra `deletedAt IS NULL`, inclusive na validação de `categoryId` em novas transações.

### Regras de Soft Delete

- **Categoria raiz:** bloqueia soft delete se existir subcategoria **ativa** (`deletedAt IS NULL`) vinculada.
- **Subcategoria:** bloqueia soft delete se existir transação **ativa** (`deletedAt IS NULL`) vinculada.
- Transações soft-deletadas **não bloqueiam** o delete da subcategoria.

> **Decisão:** categorias adotam soft delete para preservar integridade histórica das transações. Hard delete quebraria FKs de transações existentes, perdendo contexto histórico.

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
- `isDefault`: indica o cartão padrão do usuário.

### Cartão Padrão

- Cada usuário pode ter **somente um** cartão padrão (`isDefault = true`).
- Quando o usuário ainda não possui cartões, o primeiro cartão criado deve ser marcado automaticamente como padrão.
- Ao definir outro cartão como padrão, todos os demais cartões do mesmo usuário devem ser marcados como `isDefault = false`.
- Ao deletar o cartão padrão, nenhum outro cartão deve ser promovido automaticamente; o usuário fica sem cartão padrão até definir um manualmente.
- Nenhum usuário pode alterar ou consultar cartão padrão de outro usuário.
- Quando um fluxo precisar de cartão e nenhum `cardId` for informado, o sistema deve usar o cartão padrão do usuário autenticado.
- Se nenhum cartão existir para o usuário e um fluxo exigir cartão, retornar erro claro orientando o cadastro de um cartão.

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
- A unicidade do cartão padrão deve ser preservada por usuário.

---

## 6. Salários e Períodos Financeiros

### Conceito de Período Financeiro

O sistema **não trabalha com mês calendário**. A unidade de tempo é o **período financeiro**, definido pela data real de recebimento do salário (`paidAt`).

```
Período Financeiro de Maio/2025:
  início:  07/05/2025  (paid_at deste salário)
  fim:     05/06/2025  (paid_at do próximo salário - 1 dia)
```

### Salary

- Imutável — sem `updatedAt`, sem endpoint de edição.
- `paidAt` é informado **manualmente** pelo usuário na data em que recebeu.
- Constraint única: `(userId, paidAt)` — não pode haver dois salários no mesmo dia para o mesmo usuário.

### SalaryPeriod

**Gerado automaticamente** pelo `SalaryService` sempre que um novo `Salary` é inserido. O usuário nunca interage diretamente com `SalaryPeriod`.

Campos:

- `startedAt` = `salary.paidAt`
- `endedAt` = `paidAt do próximo salário - 1 dia` (NULL se for o mais recente)
- `referenceMonth` = primeiro dia do mês de `paidAt` (ex: `2025-05-01`)

### Fluxo ao inserir novo salário — CreateSalaryService

O `CreateSalaryService` executa os seguintes passos em ordem:

1. Criar o registro em `Salary`.
2. Buscar o `SalaryPeriod` mais recente do usuário (onde `endedAt IS NULL`).
3. Atualizar o `endedAt` desse período para `novoSalary.paidAt - 1 dia`.
4. Criar o novo `SalaryPeriod` com `endedAt = NULL`.
5. Chamar `LinkOrphanInstallmentsService` passando o `periodId` recém-criado e o `referenceMonth`.

> **Nota:** este passo 5 só tem efeito sobre parcelas de `FixedExpense` (ver seção 8). Transações de crédito comuns (`Transaction`) nunca ficam órfãs — seu `periodId` é resolvido pela data real da compra no momento da criação (ver seção 7), então não há nada para religar aqui.

### LinkOrphanInstallmentsService

Service dedicado, chamado pelo `CreateSalaryService` após criar o novo `SalaryPeriod`. Responsabilidade única: vincular **parcelas de `FixedExpense`** órfãs ao período recém-criado. **Não atua sobre `Transaction` de crédito comum** — apenas sobre `Transaction`s geradas como parcela (`fixedExpenseId IS NOT NULL`).

```sql
UPDATE transactions
SET period_id = :periodId
WHERE user_id = :userId
  AND fixed_expense_id IS NOT NULL
  AND period_id IS NULL
  AND billing_date = :referenceMonth
```

> **Decisão (ponto 1, revisada):** parcelas de `FixedExpense` podem ser criadas com `periodId = NULL` quando o `SalaryPeriod` do mês da parcela ainda não existe — isso é esperado, já que parcelas futuras distantes (ex: parcela 12/12) frequentemente cobrem meses para os quais nenhum salário foi cadastrado ainda. A ausência de período nunca impede a geração das parcelas. O vínculo é feito automaticamente pelo `LinkOrphanInstallmentsService` quando o salário correspondente for cadastrado. **Transações de crédito comuns não usam mais este mecanismo** (ver seção 7) — elas sempre nascem com `periodId` resolvido, pois sua data de referência é a data real da compra (presente ou passado), que sempre tem um `SalaryPeriod` vigente.

### Remoção do Salário Mais Recente (Correção de Erro de Cadastro)

Diferente da regra geral de imutabilidade, o **salário mais recente** cadastrado pelo usuário pode ser removido. O objetivo é permitir corrigir erros de digitação (data ou valor errados) sem deixar o usuário permanentemente preso a um cadastro incorreto.

**Definição de "mais recente":** o `Salary` cujo `SalaryPeriod` correspondente tem `endedAt = NULL`. Não é permitido deletar nenhum outro salário do histórico — apenas o último.

**Esse delete é HARD DELETE**, diferente do padrão de soft delete usado no resto do sistema. A justificativa é que aqui não se trata de um evento real que precisa ficar no histórico, e sim de desfazer um cadastro que nunca deveria ter existido.

**Validações antes de permitir a remoção:**

1. O salário deve ser o mais recente do usuário (`endedAt IS NULL` no `SalaryPeriod` correspondente).
2. Buscar transações **ativas** (`deletedAt IS NULL`) de `DEBIT`, `PIX` **ou `CREDIT`** vinculadas a esse `periodId`. Se existir **qualquer uma**, **bloquear a remoção** com erro claro orientando o usuário a remover (soft delete) essas transações antes. Transações **soft-deletadas não contam para esta validação** — elas não impactam saldo (seção 11) e por isso não devem impedir a correção do salário.
3. Parcelas de `FixedExpense` (ativas ou soft-deletadas) vinculadas a esse `periodId` **não bloqueiam** a remoção — elas serão desvinculadas automaticamente (ver fluxo abaixo).

**Fluxo de remoção — `DeleteSalaryService`:**

```
1. Validar que o salário é o mais recente (endedAt do período = NULL)
2. Buscar transações ATIVAS (deletedAt IS NULL) de DEBIT, PIX ou CREDIT
   (exceto parcelas de FixedExpense) vinculadas ao periodId
   → Se existir alguma, lançar erro e abortar (nenhuma alteração é feita)
3. Chamar `UnlinkOrphanInstallmentsService(periodId)` — desvincula TODAS as
   transações vinculadas a esse período que não podem permanecer referenciando
   um SalaryPeriod que será hard-deletado:
     a) parcelas de FixedExpense (ativas ou soft-deletadas)
     b) transações comuns (DEBIT, PIX, CREDIT) já soft-deletadas
   (transações comuns ATIVAS já foram garantidas ausentes pelo passo 2)
4. Deletar o SalaryPeriod (hard delete)
5. Deletar o Salary (hard delete)
6. Reabrir o período anterior: setar endedAt = NULL nele
```

> **Por que o passo 3 também cobre soft-deletadas:** a constraint `onDelete: Restrict` entre `Transaction.periodId` e `SalaryPeriod.id` não distingue soft delete — qualquer linha de `Transaction`, ativa ou não, que ainda referencie o `periodId` impede o hard delete do `SalaryPeriod` no banco. Por isso, mesmo uma transação soft-deletada (que não bloqueia a remoção pela regra de negócio do passo 2) precisa ser desvinculada antes do hard delete, ou a operação falha por violação de FK.

**`UnlinkOrphanInstallmentsService`** — service dedicado, espelha exatamente o comportamento inverso do `LinkOrphanInstallmentsService` (seção 6). Responsabilidade única:

```sql
UPDATE transactions
SET period_id = NULL
WHERE period_id = :periodId
  AND (
    fixed_expense_id IS NOT NULL
    OR deleted_at IS NOT NULL
  )
```

> **Decisão (revisada):** antes, transações de crédito comuns eram desvinculadas automaticamente para nunca bloquear a remoção do salário, já que seu vínculo de período vinha do mês da fatura. Agora que o `periodId` de uma `Transaction` comum **ativa** reflete a data real em que o gasto foi feito (ver seção 7), desvincular essa transação ao deletar o salário deixaria de fazer sentido — apagaria o registro de quando o dinheiro foi efetivamente gasto. Por isso, `CREDIT` **ativo** passa a se comportar como `DEBIT`/`PIX` **ativo** aqui: **bloqueia a remoção**. As duas exceções que continuam sendo desvinculadas automaticamente são: (1) parcelas de `FixedExpense`, porque seu vínculo é estrutural ao calendário de pagamento da parcela e não a um gasto pontual já realizado; e (2) qualquer transação já soft-deletada, de qualquer tipo, porque ela não representa mais um evento real para o saldo e existe apenas como linha técnica que precisa ser desvinculada para não violar a constraint de FK no hard delete do período.

**Endpoint:**

| Método | Rota            | Descrição                                                               |
| ------ | --------------- | ----------------------------------------------------------------------- |
| DELETE | `/salaries/:id` | Remove o salário mais recente (hard delete) e reabre o período anterior |

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

O `periodId` é resolvido com base na **data âncora**. A partir desta revisão, **a regra é a mesma para todos os tipos de transação** (`CREDIT`, `DEBIT`, `PIX`): a data âncora é sempre a data real em que o gasto ocorreu, nunca o mês da fatura do cartão.

```
dataAncora = transaction_date  (para CREDIT, DEBIT e PIX)

Query:
SELECT id FROM salary_periods
WHERE user_id = :userId
  AND started_at <= :dataAncora
  AND (ended_at >= :dataAncora OR ended_at IS NULL)
ORDER BY started_at DESC
LIMIT 1
```

> **Importante — `billingDate` e `periodId` são independentes:** o `billingDate` (seção anterior) determina **apenas** a qual fatura do cartão a compra pertence, para fins de agrupamento em `GET /reports/billing`. O `periodId` determina o **saldo disponível** debitado, e reflete sempre o período financeiro vigente no momento da compra. Uma compra de crédito feita em 16/06 (com cartão fechando dia 06) tem `billingDate` em julho, mas `periodId` referente a junho — ela entra na fatura de julho, mas debita o saldo de junho, porque foi nele que o compromisso foi assumido.

> **Decisão (revisada):** anteriormente, o `periodId` de transações de `CREDIT` era resolvido pelo mês da fatura (`billingDate`), o que causava dois problemas práticos: (1) uma compra feita após o fechamento do cartão não debitava o saldo do período vigente, dando a falsa impressão de saldo disponível maior do que realmente havia; e (2) compras feitas em meses para os quais ainda não existia salário cadastrado ficavam órfãs (`periodId = NULL`) até o cadastro do salário seguinte. Como o período mais recente (`endedAt IS NULL`) cobre indefinidamente o presente e o futuro até ser encerrado por um novo salário, a nova regra garante que **toda transação comum sempre encontra um período vigente** no momento da criação — eliminando a necessidade de órfã para este caso (ver seção 6).

### Período não encontrado

- **CRÉDITO, DÉBITO e PIX:** ausência de `SalaryPeriod` vigente para a `transaction_date` **retorna erro** solicitando que o usuário cadastre seu salário. Isso só ocorre se nenhum salário tiver sido cadastrado ainda (nem o mais antigo) — uma vez que exista ao menos um `Salary`, o período mais recente cobre qualquer data presente ou futura.

### Exemplos de resolução de período

```
Configuração:
  Cartão B fecha dia 06
  Salário de Maio: paidAt = 07/05/2025
  Salário de Junho: paidAt = 06/06/2025

Compra CRÉDITO (Cartão B) em 05/05:
  billingDate = 01/05/2025 (fatura de Maio, dia 05 < 06)
  periodId: dataAncora = 05/05 → 05/05 < paidAt de Maio (07/05) → period = Abril ✓

Compra CRÉDITO (Cartão B) em 16/05:
  billingDate = 01/06/2025 (fatura de Junho, dia 16 >= 06)
  periodId: dataAncora = 16/05 → 16/05 >= paidAt de Maio (07/05) e < paidAt de Junho (06/06) → period = Maio ✓
  (a compra entra na fatura de Junho, mas debita o saldo do período de Maio — vigente na data da compra)

Compra CRÉDITO (Cartão B) em 16/06, sem salário de Julho cadastrado ainda:
  billingDate = 01/07/2025 (fatura de Julho, dia 16 >= 06)
  periodId: dataAncora = 16/06 → 16/06 >= paidAt de Junho (06/06) → period = Junho ✓
  (período de Junho está aberto, endedAt = NULL, então cobre 16/06 normalmente)

PIX em 06/05:
  dataAncora = 06/05/2025
  06/05 < paidAt de Maio (07/05) → period = Abril ✓

PIX em 07/05:
  dataAncora = 07/05/2025
  07/05 >= paidAt de Maio (07/05) → period = Maio ✓
```

### Validações

- `categoryId` deve referenciar uma **subcategoria** (`parentId IS NOT NULL`).
- `categoryId` deve pertencer ao `userId` autenticado e estar ativo (`deletedAt IS NULL`).
- `cardId`, se informado, deve pertencer ao `userId` autenticado.
- `type` deve ser `CREDIT`, `DEBIT` ou `PIX`.
- Se `type = CREDIT`, usar o `cardId` informado; se ele não for informado, usar o cartão padrão do usuário autenticado.
- Se `type = CREDIT` e o usuário não possuir cartão padrão, retornar erro claro solicitando cadastro ou definição de um cartão padrão.
- Se `type = DEBIT` ou `PIX`, `cardId` deve ser **nulo**.

---

## 8. Gastos Fixos Parcelados

### Criação

Ao criar um `FixedExpense`, o `FixedExpenseService` deve **automaticamente gerar todas as parcelas** como `Transaction` individuais via `CreateTransactionService` (injeção entre módulos), calculando `billingDate` e `periodId` para cada uma.

**Algoritmo de geração de parcelas:**

```
Para i de 0 até totalInstallments - 1:
  Se tem cardId:
    baseDate = startMonth + i meses
    Aplicar regra de billingDate do cartão sobre baseDate
  Senão:
    billingDate = startMonth + i meses (1º dia)

  Calcular periodId a partir do billingDate (regra de crédito)
  Se SalaryPeriod não existir para o mês: periodId = NULL

  Criar Transaction com:
    fixedExpenseId = fixedExpense.id
    billingDate    = calculado
    periodId       = calculado (ou NULL)
    amount         = installmentAmount
    description    = "{description} — Parcela {i+1}/{totalInstallments}"
```

> **Decisão (ponto 3):** parcelas sem `SalaryPeriod` são criadas com `periodId = NULL`. O `LinkOrphanInstallmentsService` (seção 6) vincula automaticamente quando o salário for cadastrado. Rejeitar a criação tornaria o recurso inutilizável na prática, pois quase sempre haverá parcelas em meses sem salário cadastrado. **Esta é a única situação no sistema em que uma `Transaction` pode nascer com `periodId = NULL`** — parcelas de `FixedExpense` continuam vinculadas pelo mês da própria parcela (`billingDate`), não pela data de criação do gasto fixo, pois representam um compromisso recorrente que se espalha mês a mês.

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

- Entradas mensais representam receitas extras (freelance, aluguel recebido, reembolsos de amigos, etc.).
- Cada entrada possui o campo `includeInBalance` (boolean, **default `false`**) que controla individualmente se ela entra no cálculo do saldo disponível.
- **Não impactam o saldo por padrão** — o usuário decide conscientemente, por entrada, se aquele valor deve ser abatido do saldo.
- Isso preserva rastreabilidade: o gasto original fica registrado pelo valor total, e a entrada registra o reembolso separadamente, sem perder o histórico de nenhum dos dois.
- O campo `month` armazena sempre o primeiro dia do mês de referência (ex: `2025-05-01`).
- Soft delete via `deletedAt`.
- O `POST /incomes` aceita `includeInBalance` no body.
- O `GET /incomes` retorna `includeInBalance` para exibição no frontend.

> **Decisão:** o campo global `User.includeIncomesInBalance` foi removido. O controle por entrada é mais granular e consistente com o princípio do sistema de que nada impacta o saldo sem intenção explícita do usuário.

---

## 10. Gastos à Parte

- Valores que **não são transações**, mas impactam o saldo disponível.
- Exemplos: reserva de emergência, poupança mensal, separar dinheiro para evento futuro.

> **Decisão (ponto 4):** `AsideExpense` não vira transação. São naturezas diferentes — transação é algo que **aconteceu** (foi pago, foi debitado), `AsideExpense` é uma **reserva intencional** (dinheiro separado que continua na conta do usuário). Entram diretamente na fórmula do saldo, sem gerar registros em `Transaction`.

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
  + SUM(incomes do período P onde includeInBalance = true e deletedAt IS NULL)
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
      "total": 850.0,
      "children": [
        { "subcategory": "Mercado", "total": 600.0 },
        { "subcategory": "Lanches", "total": 250.0 }
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
- Deve chamar `LinkOrphanInstallmentsService` após criar o novo período.
- Deve rejeitar dois salários no mesmo dia para o mesmo usuário.
- Deve retornar salário vigente via fallback (último `paidAt <= dataConsultada`).
- Deve retornar erro se nenhum salário cadastrado.

**`LinkOrphanInstallmentsService`**

- Deve vincular parcelas de `FixedExpense` com `periodId = NULL` ao período correto pelo `referenceMonth`.
- Não deve afetar `Transaction` de crédito comum (sem `fixedExpenseId`).
- Não deve afetar transações de `DEBIT` ou `PIX`.
- Não deve afetar transações com `periodId` já preenchido.

**`DeleteSalaryService`**

- Deve permitir remover apenas o salário mais recente (`endedAt IS NULL` no período).
- Deve rejeitar remoção se existir salário mais recente que o informado.
- Deve bloquear remoção se existir transação **ativa** (`deletedAt IS NULL`) de `DEBIT`, `PIX` ou `CREDIT` (não-parcela) vinculada ao período.
- Não deve bloquear remoção se a única transação `DEBIT`, `PIX` ou `CREDIT` vinculada estiver soft-deletada (`deletedAt` preenchido).
- Deve desvincular (periodId = NULL) parcelas de `FixedExpense` (ativas ou soft-deletadas) vinculadas ao período antes de deletar.
- Deve desvincular (periodId = NULL) transações comuns soft-deletadas (`DEBIT`, `PIX`, `CREDIT`) vinculadas ao período antes de deletar, para não violar a constraint de FK no hard delete do `SalaryPeriod`.
- Deve deletar o `SalaryPeriod` e o `Salary` (hard delete) com sucesso mesmo havendo transações soft-deletadas previamente vinculadas.
- Deve reabrir o período anterior (`endedAt = NULL`) após a remoção.
- Não deve permitir deletar salário de outro usuário.

**`UnlinkOrphanInstallmentsService`**

- Deve voltar `periodId` para `NULL` em todas as parcelas de `FixedExpense` (ativas ou soft-deletadas) vinculadas ao período informado.
- Deve voltar `periodId` para `NULL` em transações comuns (`DEBIT`, `PIX`, `CREDIT`) **soft-deletadas** vinculadas ao período informado.
- Não deve afetar transações comuns **ativas** de nenhum tipo (`DEBIT`, `PIX`, `CREDIT`) — essas já são garantidas ausentes pela validação de bloqueio antes deste service ser chamado.
- Não deve afetar transações de outros períodos.

**`TransactionService` — regra de `billingDate`**

- CRÉDITO, dia < closingDay → billingDate = 1º dia do mês corrente.
- CRÉDITO, dia >= closingDay → billingDate = 1º dia do mês seguinte.
- CRÉDITO, closingDay = 1, compra dia 1 → billingDate = 1º dia do mês seguinte.
- CRÉDITO, closingDay = 31, compra dia 31 → billingDate = 1º dia do mês seguinte.
- DÉBITO/PIX → billingDate = transaction_date.
- Mês com 31 dias, compra dia 30, closingDay = 30 → billingDate = mês seguinte.

**`TransactionService` — regra de `periodId`**

- CRÉDITO: deve buscar período pelo período vigente na `transaction_date` (mesma regra de DÉBITO/PIX), não pelo `billingDate`.
- CRÉDITO: compra após o fechamento do cartão (billingDate no mês seguinte) ainda deve debitar o saldo do período vigente na data da compra.
- CRÉDITO, DÉBITO/PIX: compra no dia do pagamento → período atual.
- CRÉDITO, DÉBITO/PIX: compra no dia anterior ao pagamento → período anterior.
- CRÉDITO, DÉBITO/PIX: sem `SalaryPeriod` vigente (nenhum salário cadastrado ainda) → retornar erro.

**`FixedExpenseService`**

- Deve gerar exatamente `totalInstallments` transações ao criar.
- Cada parcela deve ter `billingDate` e `periodId` corretos, vinculados pelo mês da própria parcela.
- Parcelas sem `SalaryPeriod` devem ser criadas com `periodId = NULL` (nunca rejeitar).
- Soft delete deve apagar parcelas futuras e preservar passadas.

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
- Deve rejeitar soft delete de raiz com filhos ativos (`deletedAt IS NULL`).
- Deve rejeitar soft delete de subcategoria com transações ativas (`deletedAt IS NULL`).
- Transações soft-deletadas não devem bloquear o delete da subcategoria.
- Deve retornar árvore aninhada corretamente filtrando `deletedAt IS NULL`.

**`CardService`**

- Deve rejeitar `closingDay` fora de 1–31.
- Deve rejeitar delete com transações vinculadas.
- Não deve retornar cartões de outros usuários.
- Primeiro cartão criado para o usuário deve ser padrão.
- Deve permitir trocar o cartão padrão do usuário autenticado.
- Deve garantir somente um cartão padrão por usuário.
- Deve rejeitar troca de padrão para cartão inexistente ou de outro usuário.

---

## 13. Estrutura de Módulos

O projeto deve seguir a estrutura **MVCS**:

- **Model:** representado pelos models do Prisma.
- **View:** não se aplica diretamente à API, mas o contrato de entrada/saída deve ficar claro via controllers e DTOs.
- **Controller:** recebe a requisição, aplica guards/decorators e delega a regra de negócio.
- **Service:** concentra a regra de negócio em arquivos pequenos e específicos.

Dentro de cada módulo, `services/` deve ter **um arquivo para cada função/caso de uso**. Não concentrar todas as ações em um único arquivo `*.service.ts`.

```
src/
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── shared/
│   └── helpers/
│       ├── billing-date.helper.ts
│       └── reference-month.helper.ts
├── module-name/
│   ├── module-name.module.ts
│   ├── module-name.controller.ts
│   ├── module-name.controller.spec.ts
│   ├── dto/
│   │   └── create-module-name.dto.ts
│   └── services/
│       ├── create-module-name.service.ts
│       ├── find-all-module-name.service.ts
│       ├── find-one-module-name.service.ts
│       ├── update-module-name.service.ts
│       └── delete-module-name.service.ts
└── app.module.ts
```

---

## 14. Endpoints

Todos os endpoints abaixo (exceto `auth`) exigem JWT válido via Guard.
O `userId` é sempre extraído do token — nunca do body da requisição.

### Auth

| Método | Rota             | Descrição                                          |
| ------ | ---------------- | -------------------------------------------------- |
| POST   | `/auth/register` | Cria conta                                         |
| POST   | `/auth/login`    | Retorna accessToken (body) + refreshToken (cookie) |
| POST   | `/auth/refresh`  | Renova accessToken via refreshToken (cookie)       |

### Users

| Método | Rota        | Descrição                         |
| ------ | ----------- | --------------------------------- |
| GET    | `/users/me` | Retorna perfil (sem passwordHash) |
| PATCH  | `/users/me` | Atualiza nome, email ou senha     |

### Categories

| Método | Rota              | Descrição                        |
| ------ | ----------------- | -------------------------------- |
| POST   | `/categories`     | Cria categoria ou subcategoria   |
| GET    | `/categories`     | Lista árvore aninhada do usuário |
| DELETE | `/categories/:id` | Soft delete com validações       |

### Cards

| Método | Rota                 | Descrição                                   |
| ------ | -------------------- | ------------------------------------------- |
| POST   | `/cards`             | Cria cartão                                 |
| GET    | `/cards`             | Lista cartões do usuário                    |
| PATCH  | `/cards/:id`         | Atualiza nome ou closingDay                 |
| PATCH  | `/cards/default/:id` | Define cartão padrão do usuário             |
| DELETE | `/cards/:id`         | Remove cartão (hard delete, com validações) |

### Salaries

| Método | Rota                | Descrição                                                               |
| ------ | ------------------- | ----------------------------------------------------------------------- |
| POST   | `/salaries`         | Registra salário e gera período financeiro                              |
| GET    | `/salaries`         | Lista histórico de salários                                             |
| GET    | `/salaries/current` | Retorna salário vigente hoje                                            |
| DELETE | `/salaries/:id`     | Remove o salário mais recente (hard delete) e reabre o período anterior |
| DELETE | `/salaries/:id`     | Remove o salário mais recente (hard delete, com validações)             |

### Incomes

| Método | Rota                     | Descrição                |
| ------ | ------------------------ | ------------------------ |
| POST   | `/incomes`               | Registra entrada mensal  |
| GET    | `/incomes?month=2025-05` | Lista entradas de um mês |
| DELETE | `/incomes/:id`           | Soft delete              |

### Transactions

| Método | Rota                                 | Descrição                                          |
| ------ | ------------------------------------ | -------------------------------------------------- |
| POST   | `/transactions`                      | Registra gasto (billingDate e periodId calculados) |
| GET    | `/transactions?periodId=uuid`        | Lista por período financeiro                       |
| GET    | `/transactions?billingMonth=2025-05` | Lista por fatura do cartão                         |
| DELETE | `/transactions/:id`                  | Soft delete                                        |

### Fixed Expenses

| Método | Rota                  | Descrição                                     |
| ------ | --------------------- | --------------------------------------------- |
| POST   | `/fixed-expenses`     | Cria gasto fixo e gera todas as parcelas      |
| GET    | `/fixed-expenses`     | Lista gastos fixos ativos                     |
| DELETE | `/fixed-expenses/:id` | Soft delete + soft delete em parcelas futuras |

### Aside Expenses

| Método | Rota                  | Descrição          |
| ------ | --------------------- | ------------------ |
| POST   | `/aside-expenses`     | Cria gasto à parte |
| GET    | `/aside-expenses`     | Lista ativos       |
| DELETE | `/aside-expenses/:id` | Soft delete        |

### Reports

| Método | Rota                             | Descrição                             |
| ------ | -------------------------------- | ------------------------------------- |
| GET    | `/reports/balance`               | Saldo disponível do período atual     |
| GET    | `/reports/period/:periodId`      | Resumo completo do período financeiro |
| GET    | `/reports/billing?month=2025-05` | Visão por fatura de cartão            |

**`GET /reports/balance` — detalhamento:**

- Não recebe parâmetros.
- Identifica o período atual buscando o `SalaryPeriod` onde `startedAt <= hoje` e `endedAt IS NULL` (ou `endedAt >= hoje`).
- Calcula o saldo disponível conforme a fórmula da seção 11.
- Retorna apenas o número final e a identificação do período:

```json
{
  "available": 1850.0,
  "periodId": "uuid",
  "periodStart": "2025-05-07",
  "periodEnd": null
}
```

- `periodId` é retornado para permitir navegação ao relatório completo via `GET /reports/period/:periodId`.
- Se nenhum período existir (usuário sem salário cadastrado), retornar erro orientando o cadastro do salário.
