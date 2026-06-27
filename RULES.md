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
   8.1. [Gastos Fixos Recorrentes](#81-gastos-fixos-recorrentes)
9. [Entradas Mensais](#9-entradas-mensais)
10. [Gastos à Parte](#10-gastos-à-parte)
11. [Relatórios e Cálculo de Saldo](#11-relatórios-e-cálculo-de-saldo)
12. [Testes](#12-testes)
13. [Estrutura de Módulos](#13-estrutura-de-módulos)
14. [Endpoints](#14-endpoints)
15. [Idempotência e Rate Limiting (Planejado)](#15-idempotência-e-rate-limiting-planejado)

---

## 1. Stack e Bibliotecas

| Camada                | Tecnologia                                |
| --------------------- | ----------------------------------------- |
| Framework             | NestJS com TypeScript                     |
| Banco de dados        | PostgreSQL                                |
| ORM                   | Prisma                                    |
| Autenticação          | JWT (access + refresh token)              |
| Hash de senha         | Argon2                                    |
| Hash de refresh token | SHA-256 (nativo do Node, módulo `crypto`) |
| Manipulação de datas  | date-fns                                  |
| Testes                | Jest + @nestjs/testing                    |

- Swagger **não** deve ser implementado neste momento.
- O projeto é **multi-usuário** — todo dado é isolado por `userId`. Nenhum endpoint retorna dados de outro usuário.

---

## 2. Princípios Gerais

### Imutabilidade

Os seguintes recursos são **imutáveis** — uma vez criados, não podem ser editados:

- `Salary` (salários)
- `Transaction` (transações)

Esses models **não possuem** `updatedAt`. A ausência do campo é intencional. Endpoints `PATCH` ou `PUT` **não devem existir** para esses recursos. Para corrigir um registro, o usuário deve apagar (soft delete) e criar um novo.

> **Exceção única:** `PATCH /transactions/:id/pay` (seção 8.1) é o único endpoint de mutação permitido sobre `Transaction`, e está restrito exclusivamente ao campo `paid` — usado para marcar como paga uma ocorrência de `FixedExpense` via PIX/DÉBITO. Não altera nenhum outro campo, não afeta `billingDate`, `periodId` ou o cálculo de saldo, e não estabelece precedente para outras edições de `Transaction`.

### Soft Delete

Os seguintes recursos usam soft delete via campo `deletedAt`:

- `Transaction`
- `Income`
- `InstallmentExpense`
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
- **Injeção entre módulos** — quando o caso de uso envolve banco ou regra de negócio de outro módulo. Exemplos: `CreateTransactionService` injetado no `InstallmentExpenseService`, `LinkOrphanInstallmentsService` injetado no `CreateSalaryService`.

> **Regra prática:** se precisa de banco ou de regra de negócio de outro módulo, injeta. Se é lógica pura de cálculo, vira helper.

---

## 3. Autenticação e Usuários

### Registro

- Email deve ser único no sistema.
- Senha deve ser hasheada com **Argon2** antes de persistir. Nunca salvar plain text.
- Retornar erro claro se email já estiver em uso.

### Model `RefreshToken`

Diferente do `accessToken` (JWT puramente stateless, validado só pela assinatura), o `refreshToken` é **persistido no banco** — isso é o que permite revogação real (logout, detecção de roubo), algo impossível com um JWT puramente stateless.

```prisma
model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

- **Nunca persistir o JWT completo.** Salvar apenas `tokenHash` (SHA-256 do JWT). Se o banco for comprometido (vazamento, backup mal protegido), o hash não permite reconstruir o token original — mesmo princípio do hash de senha (seção 3, Senha), mas sem necessidade de um algoritmo lento como Argon2, já que não é segredo de usuário e o objetivo aqui é só evitar reversão direta.
- **Múltiplas sessões simultâneas são permitidas.** Um usuário pode ter vários `RefreshToken` válidos ao mesmo tempo (ex: navegador + app mobile + futuro bot Telegram/WhatsApp, seção de planos futuros). Cada login cria um novo registro independente; nenhum invalida os demais.

### Login

- Validar email e senha.
- Retornar `accessToken` (JWT, expiração curta — **15 minutos**) no body.
- Gerar `refreshToken` (JWT, expiração longa — **7 dias**), calcular `tokenHash` (SHA-256) e criar o registro em `RefreshToken` com `expiresAt = now() + 7 dias`.
- Retornar o `refreshToken` (JWT original, não o hash) em **httpOnly cookie** — nunca exposto no body.
- Rejeitar com erro genérico se credenciais forem inválidas (não diferenciar "email não existe" de "senha errada" para evitar enumeração de usuários).

**Opções do cookie do `refreshToken`** (usar um helper único, reaproveitado em login, refresh e logout, para garantir consistência entre criação e limpeza):

- `httpOnly: true` — nunca acessível via JavaScript no navegador.
- `path: '/auth'` — o cookie só é enviado pelo navegador em chamadas para `/auth/*` (login, refresh, logout). Em qualquer outra rota da API, o cookie não trafega — reduz a superfície de exposição, já que nenhuma outra rota depende dele (todas usam `accessToken` via header `Authorization`).
- `sameSite: 'lax'`, `secure: false` em desenvolvimento (HTTP local). Em produção, com HTTPS, `secure: true` deve ser usado — revisar quando o domínio de produção for definido (seção CORS, abaixo).
- **As mesmas opções usadas ao criar o cookie devem ser usadas ao limpá-lo** (`res.clearCookie`) — divergência entre as opções de criação e limpeza faz o navegador não remover o cookie corretamente.

### Refresh Token — Rotação

- Endpoint `POST /auth/refresh` recebe o `refreshToken` via cookie.
- Calcula o `tokenHash` do token recebido.
- Dentro de uma única `prisma.$transaction`:
  1. **Revogar atomicamente** o registro ativo correspondente via `updateMany` condicional: `WHERE tokenHash = hash AND revokedAt IS NULL AND expiresAt > now()`, `SET revokedAt = now()`.
  2. Se `count = 0` (nenhuma linha afetada) → rejeitar. Isso cobre token inválido, expirado, já revogado, **ou já consumido por outra chamada concorrente com o mesmo token de entrada**.
  3. Se `count = 1` → esta é a única chamada que "ganhou o direito" de rotacionar este token. Gerar o novo `refreshToken` (JWT, 7 dias), calcular o novo `tokenHash`, criar o novo registro em `RefreshToken`.
  4. Gerar novo `accessToken`.
  5. Retornar o novo `accessToken` no body e o novo `refreshToken` no cookie (substituindo o antigo).

> **Por que `updateMany` condicional, e não `findFirst` seguido de `update`/`create` separados:** ler o registro antes de revogá-lo cria uma janela onde duas chamadas concorrentes (duas abas, retry de rede, efeito duplicado de `StrictMode` no frontend) podem ler o **mesmo** token ainda ativo e ambas seguirem adiante, cada uma gerando sua própria rotação a partir da mesma origem — quebrando a garantia de "um token consumido gera no máximo um sucessor". Pior ainda: se o novo JWT gerado pelas duas chamadas for byte-a-byte idêntico (payload igual + `iat` com granularidade de segundo, no caso de chamadas no mesmo segundo), a segunda tentativa de `create` falha com erro de unicidade no `tokenHash` (`P2002`). O `updateMany` resolve a causa raiz: a revogação em si é a operação atômica que decide qual chamada "vence" — apenas uma altera a linha (`count = 1`); a(s) outra(s) recebe(m) `count = 0` e é(são) rejeitada(s) **antes** de gerar qualquer token novo.

> **Causa raiz mais comum desse cenário em desenvolvimento:** o `React.StrictMode` monta, desmonta e remonta componentes propositalmente, executando `useEffect` duas vezes — se uma chamada a `/auth/refresh` for feita direto num `useEffect` de bootstrap sem guarda contra dupla execução, ela dispara duas requisições idênticas. O frontend deve protegê-lo com uma guarda (ex: `useRef`) para evitar a chamada duplicada; o backend, com o `updateMany` atômico acima, permanece correto mesmo que essa proteção falhe ou que a concorrência venha de outra origem legítima (duas abas abertas, app mobile + web simultâneos).

> **Por que rotacionar:** se um `refreshToken` já rotacionado (revogado) for apresentado novamente em uma chamada futura, isso é sinal de que o token foi copiado/roubado — o dono legítimo já o trocou por um novo. A detecção e resposta automática a esse cenário (ex: revogar todas as sessões do usuário) é uma melhoria possível, não implementada nesta versão.

### Logout

> **Guiado pelo `refreshToken`, não pelo `accessToken`.** A sessão a ser revogada é identificada pelo cookie httpOnly, não por `req.user`. Por isso, `POST /auth/logout` **não usa guard de autenticação por `accessToken`** — funciona mesmo com o access token já expirado, já que toda a lógica depende exclusivamente do cookie.

Fluxo:

1. Ler o `refreshToken` do cookie httpOnly.
2. Calcular o `tokenHash` (SHA-256) do token recebido.
3. Buscar em `RefreshToken` um registro com esse `tokenHash` e `revokedAt IS NULL` (sessão ativa).
4. Se encontrar, definir `revokedAt = now()` — revoga **apenas a sessão atual**. Outras sessões simultâneas do mesmo usuário (outros dispositivos) não são afetadas.
5. Limpar o cookie do `refreshToken` na resposta (`clearCookie`), **independentemente** de uma sessão ativa ter sido encontrada no passo 3.
6. Retornar `204 No Content`.

- Se não houver cookie, ou o token não corresponder a nenhuma sessão ativa (já revogado, expirado, ou inexistente): pular direto para os passos 5–6 — limpar o cookie e retornar `204` mesmo assim, sem erro.
- Não requer body. Idempotente por natureza: chamar duas vezes seguidas sempre resulta em `204`, com a segunda chamada simplesmente não encontrando sessão ativa para revogar.
- "Logout de todos os dispositivos" (revogar todos os `RefreshToken` do usuário) não está no escopo desta versão — possível extensão futura.

### Preferências do Usuário

- O campo `includeIncomesInBalance` foi **removido** do model `User`. O controle de se uma entrada impacta o saldo é feito individualmente em cada `Income` via campo `includeInBalance` — ver seção 9.
- O endpoint `PATCH /users/me/preferences` foi **removido**. Não há mais preferências globais relacionadas a entradas.

### Senha

- Atualização de senha deve gerar novo hash Argon2.
- Nunca retornar `passwordHash` em nenhuma resposta da API.

### CORS

O `refreshToken` é transportado via **httpOnly cookie** (ver Login, acima), e cookies cross-origin têm regras próprias no navegador — sem a configuração correta, o cookie simplesmente não é enviado nem aceito, quebrando `/auth/refresh` e `/auth/logout` silenciosamente.

- **`origin` deve ser explícito** — nunca wildcard (`*`). Cookies cross-origin exigem uma origem nomeada; `*` é incompatível com `credentials: true`.
- **`credentials: true`** obrigatório no backend, para aceitar/enviar cookies entre origens diferentes.
- A origem permitida deve vir de variável de ambiente (`FRONTEND_URL` ou equivalente), não hardcoded — facilita a transição entre desenvolvimento (`http://localhost:5173`, padrão do Vite) e o domínio de produção, ainda não definido.

```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL, // ex: http://localhost:5173 em dev
  credentials: true,
});
```

> No lado do cliente (axios), as chamadas que dependem do cookie (`/auth/refresh`, `/auth/logout`) precisam ser feitas com `withCredentials: true` — sem isso, o navegador não envia o cookie mesmo com o CORS configurado corretamente no backend.

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
6. Chamar `GenerateFixedExpenseTransactionsService` passando o `periodId` recém-criado — gera uma `Transaction` para cada `FixedExpense` ativo do usuário (`deletedAt IS NULL` e, se `endMonth` estiver definido, `endMonth >= referenceMonth` do novo período). Ver seção 8.1.

> **Atomicidade:** a partir da introdução do passo 6, todos os passos 1–6 devem ser executados dentro de uma única `prisma.$transaction`. Com mais passos e múltiplas escritas (potencialmente N transações de gastos fixos), uma falha no meio do fluxo não pode deixar o sistema em estado inconsistente (ex: `SalaryPeriod` criado sem as despesas fixas correspondentes, ou vice-versa). Se qualquer passo falhar, toda a operação deve ser revertida.

> **Nota:** este passo 5 só tem efeito sobre parcelas de `InstallmentExpense` (ver seção 8). Transações de crédito comuns (`Transaction`) nunca ficam órfãs — seu `periodId` é resolvido pela data real da compra no momento da criação (ver seção 7), então não há nada para religar aqui.

### LinkOrphanInstallmentsService

Service dedicado, chamado pelo `CreateSalaryService` após criar o novo `SalaryPeriod`. Responsabilidade única: vincular **parcelas de `InstallmentExpense`** órfãs ao período recém-criado. **Não atua sobre `Transaction` de crédito comum** — apenas sobre `Transaction`s geradas como parcela (`installmentExpenseId IS NOT NULL`).

```sql
UPDATE transactions
SET period_id = :periodId
WHERE user_id = :userId
  AND installment_expense_id IS NOT NULL
  AND period_id IS NULL
  AND billing_date = :referenceMonth
```

> **Decisão (ponto 1, revisada):** parcelas de `InstallmentExpense` podem ser criadas com `periodId = NULL` quando o `SalaryPeriod` do mês da parcela ainda não existe — isso é esperado, já que parcelas futuras distantes (ex: parcela 12/12) frequentemente cobrem meses para os quais nenhum salário foi cadastrado ainda. A ausência de período nunca impede a geração das parcelas. O vínculo é feito automaticamente pelo `LinkOrphanInstallmentsService` quando o salário correspondente for cadastrado. **Transações de crédito comuns não usam mais este mecanismo** (ver seção 7) — elas sempre nascem com `periodId` resolvido, pois sua data de referência é a data real da compra (presente ou passado), que sempre tem um `SalaryPeriod` vigente.

### Remoção do Salário Mais Recente (Correção de Erro de Cadastro)

Diferente da regra geral de imutabilidade, o **salário mais recente** cadastrado pelo usuário pode ser removido. O objetivo é permitir corrigir erros de digitação (data ou valor errados) sem deixar o usuário permanentemente preso a um cadastro incorreto.

**Definição de "mais recente":** o `Salary` cujo `SalaryPeriod` correspondente tem `endedAt = NULL`. Não é permitido deletar nenhum outro salário do histórico — apenas o último.

**Esse delete é HARD DELETE**, diferente do padrão de soft delete usado no resto do sistema. A justificativa é que aqui não se trata de um evento real que precisa ficar no histórico, e sim de desfazer um cadastro que nunca deveria ter existido.

**Validações antes de permitir a remoção:**

1. O salário deve ser o mais recente do usuário (`endedAt IS NULL` no `SalaryPeriod` correspondente).
2. Buscar transações **ativas** (`deletedAt IS NULL`) de `DEBIT`, `PIX` **ou `CREDIT`** vinculadas a esse `periodId`. Se existir **qualquer uma**, **bloquear a remoção** com erro claro orientando o usuário a remover (soft delete) essas transações antes. Transações **soft-deletadas não contam para esta validação** — elas não impactam saldo (seção 11) e por isso não devem impedir a correção do salário.
3. Parcelas de `InstallmentExpense` (ativas ou soft-deletadas) vinculadas a esse `periodId` **não bloqueiam** a remoção — elas serão desvinculadas automaticamente (ver fluxo abaixo).

**Fluxo de remoção — `DeleteSalaryService`:**

```
1. Validar que o salário é o mais recente (endedAt do período = NULL)
2. Buscar transações ATIVAS (deletedAt IS NULL) de DEBIT, PIX ou CREDIT
   (exceto parcelas de InstallmentExpense) vinculadas ao periodId
   → Se existir alguma, lançar erro e abortar (nenhuma alteração é feita)
3. Chamar `UnlinkOrphanInstallmentsService(periodId)` — desvincula TODAS as
   transações vinculadas a esse período que não podem permanecer referenciando
   um SalaryPeriod que será hard-deletado:
     a) parcelas de InstallmentExpense (ativas ou soft-deletadas)
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
    installment_expense_id IS NOT NULL
    OR deleted_at IS NOT NULL
  )
```

> **Decisão (revisada):** antes, transações de crédito comuns eram desvinculadas automaticamente para nunca bloquear a remoção do salário, já que seu vínculo de período vinha do mês da fatura. Agora que o `periodId` de uma `Transaction` comum **ativa** reflete a data real em que o gasto foi feito (ver seção 7), desvincular essa transação ao deletar o salário deixaria de fazer sentido — apagaria o registro de quando o dinheiro foi efetivamente gasto. Por isso, `CREDIT` **ativo** passa a se comportar como `DEBIT`/`PIX` **ativo** aqui: **bloqueia a remoção**. As duas exceções que continuam sendo desvinculadas automaticamente são: (1) parcelas de `InstallmentExpense`, porque seu vínculo é estrutural ao calendário de pagamento da parcela e não a um gasto pontual já realizado; e (2) qualquer transação já soft-deletada, de qualquer tipo, porque ela não representa mais um evento real para o saldo e existe apenas como linha técnica que precisa ser desvinculada para não violar a constraint de FK no hard delete do período.

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

### `CreateTransactionService` — Dois Pontos de Entrada

O `CreateTransactionService` expõe dois métodos públicos, para separar explicitamente o fluxo HTTP do fluxo entre módulos:

- **`execute(userId, dto: CreateTransactionDto)`** — usado pelo controller (`POST /transactions`). Sempre calcula `billingDate` e `periodId` a partir da `transaction_date` informada, seguindo as regras desta seção.
- **`executeInternal(params: InternalCreateTransactionParams)`** — usado exclusivamente por outros services do sistema (ex: `InstallmentExpenseService`, `GenerateSingleFixedExpenseTransactionService`), que já chegam com `periodId` e demais campos resolvidos pela sua própria lógica de domínio. Aceita também `fixedExpenseId?` e `paid?`, que **nunca** são expostos no `CreateTransactionDto` público — são parâmetros exclusivos do uso interno.

> Essa separação evita um único método com comportamento condicional escondido atrás de parâmetros opcionais — quem lê o nome do método já sabe se o cálculo automático será aplicado ou não.

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

Ao criar um `InstallmentExpense`, o `InstallmentExpenseService` deve **automaticamente gerar todas as parcelas** como `Transaction` individuais via `CreateTransactionService` (injeção entre módulos), calculando `billingDate` e `periodId` para cada uma.

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
    installmentExpenseId = installmentExpense.id
    billingDate    = calculado
    periodId       = calculado (ou NULL)
    amount         = installmentAmount
    description    = "{description} — Parcela {i+1}/{totalInstallments}"
```

> **Decisão (ponto 3):** parcelas sem `SalaryPeriod` são criadas com `periodId = NULL`. O `LinkOrphanInstallmentsService` (seção 6) vincula automaticamente quando o salário for cadastrado. Rejeitar a criação tornaria o recurso inutilizável na prática, pois quase sempre haverá parcelas em meses sem salário cadastrado. **No momento desta seção, esta é a única situação no sistema em que uma `Transaction` pode nascer com `periodId = NULL`** — parcelas de `InstallmentExpense` continuam vinculadas pelo mês da própria parcela (`billingDate`), não pela data de criação do gasto parcelado, pois representam um compromisso que se espalha mês a mês até o fim das parcelas. (`FixedExpense`, seção 8.1, nunca gera órfão, pois sua geração é sempre disparada por um `SalaryPeriod` já existente.)

### Validações

- `installmentAmount * totalInstallments` deve ser igual a `totalAmount`. Rejeitar se divergir (ou calcular automaticamente um dos dois — definir na implementação).
- `startMonth` deve ser sempre o primeiro dia do mês (ex: `2025-05-01`).
- `categoryId` deve ser subcategoria do `userId`.

### Soft Delete em Cascata

Ao fazer soft delete em um `InstallmentExpense`:

1. Setar `deletedAt` no `InstallmentExpense`.
2. Buscar todas as `Transaction` vinculadas (`installmentExpenseId = id`) onde `billingDate >= hoje` e `deletedAt IS NULL`.
3. Setar `deletedAt = now()` nessas transações futuras.
4. **Não tocar** nas transações passadas (`billingDate < hoje`) — elas são histórico imutável.

---

## 8.1 Gastos Fixos Recorrentes

Diferente do `InstallmentExpense` (seção 8), o `FixedExpense` representa um gasto recorrente **sem fim contado** (aluguel, internet, assinatura) — não tem `totalInstallments`, e gera uma `Transaction` por período financeiro, indefinidamente, até ser finalizado ou removido.

### Campos do Model

- `id`, `userId`, `name`, `amount`, `categoryId`.
- `paymentMethod`: `CREDIT`, `DEBIT` ou `PIX`.
- `cardId?`: obrigatório se `paymentMethod = CREDIT`; deve ser nulo caso contrário (mesma validação de `Transaction`, seção 7).
- `endMonth?`: nullable. Define o último período em que o gasto deve gerar `Transaction`. Ausente = recorrência indefinida.
- `deletedAt?`: soft delete.

> `startInCurrentPeriod` (booleano) **não é persistido** — é um campo write-only do DTO de criação, usado apenas para decidir se a `Transaction` do período atual é gerada na própria chamada de criação (ver abaixo). Default: `true`.

### Geração de `Transaction` — Estratégia Lazy

Diferente de um job/cron, a geração das `Transaction`s mensais do `FixedExpense` é **disparada pela criação do `SalaryPeriod`**, e não por um agendador externo. Essa escolha é deliberada: os períodos financeiros do sistema são ancorados na data de recebimento do salário (seção 6), não no calendário — um cron de calendário não teria como prever, de forma confiável, quando cada usuário inicia seu próximo período. Gerar a `Transaction` no mesmo momento em que o período nasce elimina esse problema de sincronização e não exige infraestrutura de agendamento.

A geração é dividida em dois services com responsabilidades distintas, seguindo o princípio de um arquivo por caso de uso (seção 13):

**`GenerateSingleFixedExpenseTransactionService`** — responsabilidade única: gerar a `Transaction` de **um** `FixedExpense` específico para um `periodId` informado. Resolve `paid` conforme `paymentMethod` (ver abaixo) e chama `CreateTransactionService.executeInternal(...)` (ver seção 7) para persistir, já com `periodId`, `fixedExpenseId` e `paid` resolvidos — sem passar pelo cálculo de `billingDate`/`periodId` usado por transações comuns.

**`GenerateFixedExpenseTransactionsService`** — orquestrador, chamado pelo `CreateSalaryService` (passo 6, seção 6) após a criação do novo `SalaryPeriod`. Busca todos os `FixedExpense` ativos do usuário (`deletedAt IS NULL`, e `endMonth IS NULL OR endMonth >= referenceMonth` do novo período) e chama `GenerateSingleFixedExpenseTransactionService` para cada um.

> **Sem cenário de órfão:** diferente do `InstallmentExpense`, o `FixedExpense` nunca gera `Transaction` com `periodId = NULL`. A geração só é disparada quando o `SalaryPeriod` já existe (seja pelo fluxo lazy do `CreateSalaryService`, seja pela criação do próprio `FixedExpense` com `startInCurrentPeriod = true` — ver abaixo), então o vínculo já nasce resolvido.

### Criação — `CreateFixedExpenseService`

1. Criar o registro em `FixedExpense`.
2. Se `startInCurrentPeriod = true` (default quando omitido): buscar o `SalaryPeriod` vigente do usuário (`endedAt IS NULL` ou cobrindo hoje) e chamar `GenerateSingleFixedExpenseTransactionService` diretamente para esse `FixedExpense` e período — sem passar pelo orquestrador `GenerateFixedExpenseTransactionsService`, já que o `FixedExpense` a processar já é conhecido.
3. Se `startInCurrentPeriod = false`: não gerar nenhuma `Transaction` agora. A primeira ocorrência só nasce quando o próximo `SalaryPeriod` for criado.

> Se não existir nenhum `SalaryPeriod` (usuário sem salário cadastrado) e `startInCurrentPeriod = true`, retornar erro orientando o cadastro do salário antes de criar um `FixedExpense` — mesmo comportamento de ausência de período já adotado em `Transaction` (seção 7).

### Campo `paid` — Status de Pagamento por Ocorrência

O campo `paid` (`boolean?`, nullable) vive na `Transaction`, não no `FixedExpense` — o status é por ocorrência mensal, não um status único do gasto fixo.

- **Toda `Transaction` que nasce de um `FixedExpense` via `PIX` ou `DEBIT`**: `paid` nasce `false`.
- **Toda `Transaction` que nasce de um `FixedExpense` via `CREDIT`**: `paid` nasce `null` — o conceito de "pago" não se aplica individualmente, pois o pagamento é resolvido no nível da fatura do cartão (seção 7), não da transação isolada.
- **Qualquer outra `Transaction` do sistema** (não originada de `FixedExpense`, incluindo parcelas de `InstallmentExpense` e transações comuns): `paid` é sempre `null`.

> `null` aqui significa **"este conceito não se aplica a este registro"** — não deve ser interpretado como "não pago". Apenas `false` representa um pagamento PIX/DÉBITO pendente.

**Por que a `Transaction` já nasce contando no saldo, independente de `paid`:** um gasto fixo (aluguel, por exemplo) é um compromisso certo do período, não opcional. Tratá-lo como "fora do saldo até confirmar pagamento" criaria a falsa impressão de saldo disponível maior do que o real. O campo `paid` é **apenas informativo/visual** — não interfere em nenhum cálculo da seção 11.

### Marcar como Pago — `PATCH /transactions/:id/pay`

> **Excepciona a regra de imutabilidade de `Transaction` (seção 2 e seção 7).** Esta é a única mutação permitida em uma `Transaction` já criada, e está restrita exclusivamente ao campo `paid`.

- Valida que a `Transaction` pertence ao `userId` autenticado.
- Valida que `Transaction.paid IS NOT NULL` — caso contrário, retornar erro (a transação não é uma ocorrência de `FixedExpense` via PIX/DÉBITO, então não tem o que marcar como paga).
- Valida que a `Transaction` não está soft-deletada.
- Define `paid = true`. Não possui efeito sobre `billingDate`, `periodId` ou o cálculo de saldo.

### Validações

- `categoryId` deve ser subcategoria do `userId`.
- `cardId` obrigatório se `paymentMethod = CREDIT`; deve ser nulo caso contrário.
- Se `paymentMethod = CREDIT` e nenhum `cardId` for informado, usar o cartão padrão do usuário (mesmo fallback de `Transaction`, seção 7).

### Soft Delete em Cascata

Ao fazer soft delete em um `FixedExpense`:

1. Setar `deletedAt` no `FixedExpense`.
2. Buscar todas as `Transaction` vinculadas a esse `FixedExpense` onde `billingDate >= hoje` e `deletedAt IS NULL`.
3. Setar `deletedAt = now()` nessas transações futuras.
4. **Não tocar** nas transações passadas — histórico imutável, preservado mesmo após o encerramento do gasto fixo.

> Não existe endpoint `/finish` para `FixedExpense` (diferente do `AsideExpense` recorrente, seção 10.1) — o soft delete em cascata já preserva o histórico passado e interrompe a geração futura, cobrindo o mesmo objetivo sem precisar de um campo `endMonth` mutável.

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

### Finalização de Gasto Recorrente (`PATCH /aside-expenses/:id/finish`)

- Define o campo `endMonth`, preservando o histórico: períodos passados (já calculados) continuam recebendo o impacto do `AsideExpense`, e apenas períodos futuros a partir do `endMonth` deixam de contar.
- **Validação:** só é permitido finalizar um `AsideExpense` com `recurrent = true`. Tentar finalizar um `AsideExpense` com `recurrent = false` deve retornar erro — um gasto não recorrente já se aplica apenas ao seu `startMonth`, então "finalizar" não tem efeito sobre ele.
- **Validação:** retornar erro se o `AsideExpense` já estiver soft-deletado (`deletedAt IS NOT NULL`).
- O body aceita `endMonth` (opcional). Se omitido, assume o mês atual como default.
- **Não é um soft delete.** O registro continua ativo (`deletedAt IS NULL`); apenas passa a ter um limite futuro de aplicação. Por isso, finalizar **não** reescreve o saldo de períodos passados — diferente do soft delete, que ao remover o registro afetaria retroativamente todo o histórico calculado on-the-fly.
- Finalizar um `AsideExpense` que já possui `endMonth` definido deve sobrescrever o valor anterior (permite adiar ou antecipar o encerramento).

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

> **`FixedExpense` não aparece como termo próprio na fórmula.** Assim como o `InstallmentExpense`, ele gera `Transaction`s reais (seção 8.1), que já são somadas pelo termo `SUM(transactions do período P)`. O campo `paid` da `Transaction` (pago/não pago) **não é considerado** neste cálculo — é puramente informativo.

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
- Deve chamar `GenerateFixedExpenseTransactionsService` após o `LinkOrphanInstallmentsService`.
- Deve reverter todas as alterações (Salary, SalaryPeriod, parcelas religadas, transações de gastos fixos) se qualquer passo do fluxo falhar (atomicidade via `prisma.$transaction`).
- Deve rejeitar dois salários no mesmo dia para o mesmo usuário.
- Deve retornar salário vigente via fallback (último `paidAt <= dataConsultada`).
- Deve retornar erro se nenhum salário cadastrado.

**`LinkOrphanInstallmentsService`**

- Deve vincular parcelas de `InstallmentExpense` com `periodId = NULL` ao período correto pelo `referenceMonth`.
- Não deve afetar `Transaction` de crédito comum (sem `installmentExpenseId`).
- Não deve afetar transações de `DEBIT` ou `PIX`.
- Não deve afetar transações com `periodId` já preenchido.

**`DeleteSalaryService`**

- Deve permitir remover apenas o salário mais recente (`endedAt IS NULL` no período).
- Deve rejeitar remoção se existir salário mais recente que o informado.
- Deve bloquear remoção se existir transação **ativa** (`deletedAt IS NULL`) de `DEBIT`, `PIX` ou `CREDIT` (não-parcela) vinculada ao período.
- Não deve bloquear remoção se a única transação `DEBIT`, `PIX` ou `CREDIT` vinculada estiver soft-deletada (`deletedAt` preenchido).
- Deve desvincular (periodId = NULL) parcelas de `InstallmentExpense` (ativas ou soft-deletadas) vinculadas ao período antes de deletar.
- Deve desvincular (periodId = NULL) transações comuns soft-deletadas (`DEBIT`, `PIX`, `CREDIT`) vinculadas ao período antes de deletar, para não violar a constraint de FK no hard delete do `SalaryPeriod`.
- Deve deletar o `SalaryPeriod` e o `Salary` (hard delete) com sucesso mesmo havendo transações soft-deletadas previamente vinculadas.
- Deve reabrir o período anterior (`endedAt = NULL`) após a remoção.
- Não deve permitir deletar salário de outro usuário.

**`UnlinkOrphanInstallmentsService`**

- Deve voltar `periodId` para `NULL` em todas as parcelas de `InstallmentExpense` (ativas ou soft-deletadas) vinculadas ao período informado.
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

**`InstallmentExpenseService`**

- Deve gerar exatamente `totalInstallments` transações ao criar.
- Cada parcela deve ter `billingDate` e `periodId` corretos, vinculados pelo mês da própria parcela.
- Parcelas sem `SalaryPeriod` devem ser criadas com `periodId = NULL` (nunca rejeitar).
- Soft delete deve apagar parcelas futuras e preservar passadas.

**`FixedExpenseService` (gasto fixo recorrente)**

- Com `startInCurrentPeriod = true` (ou omitido): deve gerar a `Transaction` do período atual na própria criação.
- Com `startInCurrentPeriod = false`: não deve gerar nenhuma `Transaction` na criação.
- Deve rejeitar criação com `startInCurrentPeriod = true` se o usuário não tiver nenhum `SalaryPeriod` cadastrado.
- Soft delete em cascata: deve apagar `Transaction`s futuras (`billingDate >= hoje`) e preservar passadas.

**`GenerateSingleFixedExpenseTransactionService`**

- `paymentMethod = PIX` ou `DEBIT`: a `Transaction` gerada deve nascer com `paid = false`.
- `paymentMethod = CREDIT`: a `Transaction` gerada deve nascer com `paid = null`.
- Deve vincular corretamente `fixedExpenseId` e `periodId` na `Transaction` gerada, via `CreateTransactionService.executeInternal`.

**`GenerateFixedExpenseTransactionsService`**

- Ao criar um novo `SalaryPeriod`, deve gerar uma `Transaction` para cada `FixedExpense` ativo do usuário.
- Não deve gerar `Transaction` para `FixedExpense` com `endMonth` anterior ao `referenceMonth` do novo período.
- Não deve gerar `Transaction` para `FixedExpense` soft-deletado.

**`TransactionService` — `executeInternal`**

- Deve criar a `Transaction` com `periodId`, `fixedExpenseId` e `paid` exatamente como informados, sem recalcular `billingDate`/`periodId`.
- O DTO público (`CreateTransactionDto`, usado por `execute`) não deve aceitar `periodId`, `fixedExpenseId` nem `paid` como campos de entrada.

**`TransactionService` — marcar como pago (`/pay`)**

- Deve marcar `paid = true` em uma `Transaction` com `paid = false`.
- Deve rejeitar marcar como pago uma `Transaction` com `paid = null` (não é ocorrência PIX/DÉBITO de `FixedExpense`).
- Deve rejeitar marcar como pago uma `Transaction` soft-deletada.
- Deve rejeitar marcar como pago uma `Transaction` de outro usuário.
- Não deve alterar `billingDate` ou `periodId` ao marcar como pago.

**`AsideExpenseService` — finalização (`/finish`)**

- Deve definir `endMonth` ao finalizar um `AsideExpense` com `recurrent = true`.
- Deve assumir o mês atual como `endMonth` quando o body não informar o campo.
- Deve rejeitar finalização de `AsideExpense` com `recurrent = false`.
- Deve rejeitar finalização de `AsideExpense` já soft-deletado.
- Não deve alterar `deletedAt` ao finalizar (registro continua ativo).
- Deve permitir sobrescrever um `endMonth` já definido anteriormente.
- Após finalizar, períodos passados (anteriores ao novo `endMonth`) devem continuar somando o `AsideExpense` no cálculo do saldo.
- Após finalizar, períodos futuros (posteriores ao novo `endMonth`) não devem mais somar o `AsideExpense` no cálculo do saldo.

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
- Login deve criar um registro em `RefreshToken` com `tokenHash` correto (nunca o JWT completo).
- Deve permitir múltiplos `RefreshToken` simultâneos válidos para o mesmo usuário (sessões em paralelo).
- Deve rejeitar refresh token inválido, expirado ou sem registro correspondente em `RefreshToken`.
- Deve rejeitar refresh token cujo registro já está `revokedAt IS NOT NULL` (token já rotacionado/revogado).
- `POST /auth/refresh` deve revogar (`revokedAt = now()`) o registro antigo e criar um novo `RefreshToken` a cada chamada (rotação).
- `POST /auth/refresh` deve retornar um novo `refreshToken` no cookie, diferente do anterior.
- Duas chamadas concorrentes de `POST /auth/refresh` com o mesmo `refreshToken` de entrada: apenas uma deve ter sucesso; a outra deve ser rejeitada com erro de token inválido (nunca duas rotações bem-sucedidas a partir do mesmo token, e nunca erro de unique constraint vazando para o cliente).
- `POST /auth/logout` deve marcar `revokedAt = now()` apenas no `RefreshToken` correspondente ao cookie enviado.
- `POST /auth/logout` não deve afetar outros `RefreshToken` ativos do mesmo usuário (outras sessões).
- `POST /auth/logout` deve limpar o cookie do `refreshToken` na resposta.
- `POST /auth/logout` chamado sem cookie válido (ou já revogado) não deve lançar erro.
- `POST /auth/logout` deve retornar `204 No Content` em todos os cenários (sessão válida ou não).
- `POST /auth/logout` deve funcionar mesmo sem `accessToken` válido (ou com header `Authorization` ausente) — não deve exigir guard de autenticação.
- Após logout, uma tentativa de `POST /auth/refresh` com o token revogado deve ser rejeitada.

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

> **Módulo `fixed-expenses`:** segue a mesma estrutura, com `services/create-fixed-expense.service.ts`, `services/generate-single-fixed-expense-transaction.service.ts`, `services/generate-fixed-expense-transactions.service.ts` (este último injetado no módulo `salaries`, mesmo padrão de injeção entre módulos do `LinkOrphanInstallmentsService`) e `services/delete-fixed-expense.service.ts`. O service que marca uma `Transaction` como paga (`PATCH /transactions/:id/pay`) vive no módulo `transactions`, não em `fixed-expenses` — a ação opera sobre o recurso `Transaction`, então pertence ao seu próprio módulo.

---

## 14. Endpoints

Todos os endpoints abaixo (exceto `auth`) exigem JWT válido via Guard.
O `userId` é sempre extraído do token — nunca do body da requisição.

### Auth

| Método | Rota             | Descrição                                                                                              |
| ------ | ---------------- | ------------------------------------------------------------------------------------------------------ |
| POST   | `/auth/register` | Cria conta                                                                                             |
| POST   | `/auth/login`    | Retorna accessToken (body) + refreshToken (cookie)                                                     |
| POST   | `/auth/refresh`  | Rotaciona refreshToken e renova accessToken                                                            |
| POST   | `/auth/logout`   | Revoga a sessão atual (refreshToken do cookie), limpa o cookie e retorna 204. Sem guard de accessToken |

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

### Incomes

| Método | Rota                     | Descrição                |
| ------ | ------------------------ | ------------------------ |
| POST   | `/incomes`               | Registra entrada mensal  |
| GET    | `/incomes?month=2025-05` | Lista entradas de um mês |
| DELETE | `/incomes/:id`           | Soft delete              |

### Transactions

| Método | Rota                                 | Descrição                                                 |
| ------ | ------------------------------------ | --------------------------------------------------------- |
| POST   | `/transactions`                      | Registra gasto (billingDate e periodId calculados)        |
| GET    | `/transactions?periodId=uuid`        | Lista por período financeiro                              |
| GET    | `/transactions?billingMonth=2025-05` | Lista por fatura do cartão                                |
| DELETE | `/transactions/:id`                  | Soft delete                                               |
| PATCH  | `/transactions/:id/pay`              | Marca como paga (somente Transaction com `paid` não nulo) |

### Installment Expenses

| Método | Rota                        | Descrição                                     |
| ------ | --------------------------- | --------------------------------------------- |
| POST   | `/installment-expenses`     | Cria gasto parcelado e gera todas as parcelas |
| GET    | `/installment-expenses`     | Lista gastos parcelados ativos                |
| DELETE | `/installment-expenses/:id` | Soft delete + soft delete em parcelas futuras |

### Fixed Expenses

| Método | Rota                  | Descrição                                                                                |
| ------ | --------------------- | ---------------------------------------------------------------------------------------- |
| POST   | `/fixed-expenses`     | Cria gasto fixo recorrente (gera Transaction do período atual se `startInCurrentPeriod`) |
| GET    | `/fixed-expenses`     | Lista gastos fixos ativos                                                                |
| DELETE | `/fixed-expenses/:id` | Soft delete + soft delete em cascata nas transações futuras                              |

### Aside Expenses

| Método | Rota                         | Descrição                                                    |
| ------ | ---------------------------- | ------------------------------------------------------------ |
| POST   | `/aside-expenses`            | Cria gasto à parte                                           |
| GET    | `/aside-expenses`            | Lista ativos                                                 |
| DELETE | `/aside-expenses/:id`        | Soft delete                                                  |
| PATCH  | `/aside-expenses/:id/finish` | Finaliza um gasto à parte **recorrente** (define `endMonth`) |

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

---

## 15. Idempotência e Rate Limiting (Planejado)

> **Status: decisão de design registrada, implementação ainda não iniciada.** Esta seção documenta as escolhas já feitas, para que a implementação futura não precise reabrir essas discussões.

### 15.1 Idempotência

**Problema que resolve:** evitar que a mesma intenção de criação (clique duplo, retry de rede) gere registros duplicados. **Não é** sobre limitar volume de requests — isso é resolvido pela seção 15.2.

**Onde aplicar:** apenas em `POST`s que criam recursos com efeito financeiro: `Transaction`, `InstallmentExpense`, `FixedExpense`, `Income`, `AsideExpense`, `Salary`. `GET`s já são idempotentes por natureza. `DELETE`/`PATCH` operam sobre um `id` específico — repetir a chamada já é seguro por si só.

**Mecanismo:**

- O cliente gera um UUID v4 por tentativa de submissão (não por sessão, não por usuário — uma key por "clique em salvar") e envia no header `Idempotency-Key`.
- O backend verifica se a key já foi processada antes de executar o caso de uso:
  - Key inexistente → processa normalmente, salva o resultado associado à key, retorna.
  - Key já `COMPLETED` → retorna o resultado salvo, sem reprocessar.
  - Key em `PROCESSING` (corrida entre chamadas simultâneas) → retorna `409 Conflict`.

**Model novo:**

```prisma
model IdempotencyKey {
  id           String   @id @default(uuid())
  key          String   @unique
  userId       String
  endpoint     String
  status       String   // "PROCESSING" | "COMPLETED"
  responseBody Json?
  statusCode   Int?
  createdAt    DateTime @default(now())

  @@index([key])
}
```

**Onde implementar:** um `Interceptor` ou `Guard` global, não lógica espalhada em cada service — é uma preocupação transversal, no mesmo espírito do guard de autenticação.

### 15.2 Rate Limiting

**Problema que resolve:** proteger contra volume excessivo de requests — principalmente bugs de frontend (loop acidental), não abuso de terceiros, dado o perfil de uso pessoal do sistema.

**Mecanismo:** biblioteca oficial `@nestjs/throttler`, configurada globalmente via `ThrottlerModule.forRoot()` e `ThrottlerGuard` como `APP_GUARD`. Sem necessidade de middleware manual — a lib já resolve janela de tempo, contador e expiração.

**Rastreamento:** por `userId` (extraído do JWT), não por IP puro — IP isolado penalizaria uso legítimo do próprio usuário (ex: dashboard disparando várias chamadas em paralelo). Implementado via guard customizado estendendo `ThrottlerGuard`, sobrescrevendo `getTracker()`.

**Limites diferenciados por tipo de rota:** rotas de leitura (`GET /reports/*`) podem ter limite mais permissivo; rotas de escrita (criação de `Transaction`, `FixedExpense`, etc.) mais restritivas — configurado via decorator `@Throttle()` por controller/rota, sobrescrevendo o limite global.

**Armazenamento:** em memória (padrão da lib) é suficiente para o cenário atual de instância única. Caso a aplicação seja escalada para múltiplas instâncias no futuro, será necessário migrar para armazenamento compartilhado (ex: Redis via `@nest-lab/throttler-storage-redis`), pois o armazenamento em memória não é compartilhado entre instâncias diferentes.
