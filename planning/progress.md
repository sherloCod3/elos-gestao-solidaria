# Progresso — KODIE

## 19/10/2026 — Sessão de implementação

### O que foi feito

- Repositório Git inicializado em `Challenge3_KODIE`.
- Estrutura do projeto criada: `lib/`, `views/`, `public/`, `scripts/`, `tests/`, `data/`.
- `schema.sql` criado com 10 tabelas, constraints e índices.
- `db.js` criado com abertura SQLite, schema, WAL, foreign keys e transações.
- Camada de domínio implementada:
  - validação de formulários;
  - constantes de status e papéis;
  - erros de validação e domínio;
  - ledger de movimentos;
  - histórico append-only;
  - consultas de leitura;
  - casos de uso de doação, entrega, cancelamento e ajuste.
- Servidor HTTP implementado com rotas para dashboard, recursos, doadores, famílias, doações, entregas, estoque, histórico, perfil e health.
- Interface renderizada no servidor com CSS responsivo e JavaScript progressivo.
- Dashboard com estoque baixo, validade próxima, pendências, saldo por recurso e movimentações recentes.
- Seed fictício criado e executado.
- README em pt-BR criado.
- `entrega_item` adicionado ao schema e ao documento de escopo.
- Matriz T-01 a T-13 preenchida com resultados reais.

### Testes executados

Comando:

```bash
node --test --test-reporter=spec
```

Resultado: **25 testes aprovados**, sendo 15 de regras de negócio e 10 de rotas HTTP.

| Área | Resultado |
|---|---|
| CA-15 (`recurso.tipo = servico`) | Aprovado |
| Cadastro e validação de recurso | Aprovado |
| Doação multi-item sem movimento inicial | Aprovado |
| Validação de doação com entrada | Aprovado |
| Entrega com saída | Aprovado |
| Bloqueio por saldo insuficiente | Aprovado |
| Cancelamento com compensação | Aprovado |
| Bloqueio de cancelamento já distribuído | Aprovado |
| Ajuste com permissão de coordenação | Aprovado |
| Dashboard e estoque baixo | Aprovado |
| Validade próxima | Aprovado |
| Persistência após reabrir banco | Aprovado |
| Rotas HTTP e formulários | Aprovado |
| Perfil de voluntário sem validação | Aprovado |
| `/health` | Aprovado |

### Teste de interface

- Doação #3 criada pelo formulário em `http://127.0.0.1:3000/doacoes/nova`.
- Redirecionamento para `/doacoes/3?ok=doacao-criada`.
- Validação pela interface com confirmação nativa.
- Redirecionamento para `/doacoes/3?ok=doacao-validada`.
- Nenhum erro JavaScript no console, exceto o aviso de CSP do Electron.

### Problemas encontrados

- O documento aprovado listava `entrega` mas não `entrega_item`; a tabela foi adicionada por necessidade do fluxo multi-item.
- O teste de dashboard inicialmente esperava apenas um recurso abaixo do mínimo; havia também o feijão sem saldo. O teste foi corrigido para localizar o arroz especificamente.
- A captura de tela do navegador falhou por ausência de desktop visível; a árvore de acessibilidade foi usada como evidência.

### Estado atual

- Aplicação funcional e testada.
- Banco local `data/kodie.sqlite` resetado para o seed limpo: 4 recursos, 2 doadores, 3 famílias, 2 doações, 2 entregas e 1 ajuste.
- Servidor de demonstração em execução em `http://127.0.0.1:3000`; `/health` respondeu `{"ok":true,"service":"elos-mvp","users":2}`.
- Documentação, plano, achados e progresso atualizados.

### Próximo passo

Preparar a Fase 5: revisar a documentação, capturar evidências visuais e montar a apresentação de 5–7 minutos. O banco já está no seed limpo para a demonstração.
