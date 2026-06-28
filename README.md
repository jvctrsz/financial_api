# Financial API

Projeto pessoal em desenvolvimento.

API REST de controle financeiro pessoal desenvolvida com NestJS, TypeScript, PostgreSQL e Prisma.

## Sobre o projeto

A aplicação permite organizar salários, períodos financeiros, cartões, categorias, transações, entradas mensais, gastos fixos, gastos parcelados, gastos à parte e relatórios de saldo.

## Tecnologias utilizadas

* NestJS
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

## Status do projeto


A API já possui módulos principais estruturados, autenticação, persistência com Prisma e regras de negócio financeiras implementadas em diferentes partes do sistema.

Ainda há pontos planejados para evolução, como:

* Melhorar testes
* Implementar rate limiting
* Implementar idempotência em rotas de criação
* Criar uma interface web para consumir a API
* Estudar uso de Redis para cache, rate limiting ou filas

## Autor

Desenvolvido por [João Victor Matias](https://github.com/jvctrsz).

* [LinkedIn](https://www.linkedin.com/in/jvctrsz)
* [E-mail](mailto:jvictor26dev@gmail.com)
