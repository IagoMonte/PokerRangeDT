# Arquitetura — PokerRangeDT

## Stack

Vue 3, Vue Router, Vite, Tailwind CSS e Vitest, em JavaScript. A interface usa Inter no texto e JetBrains Mono nos números.

## Organização

| Pasta | Conteúdo |
| --- | --- |
| `src/engine/` | regras puras: mesa, pré e pós-flop, equity, EV, coach e métricas |
| `src/composables/` | estado e persistência: ranges, vilões, drills e analytics |
| `src/components/` | mesa, matriz de ranges, overlays e páginas |
| `src/infra/` | formatação, ranking de mãos e utilitários |
| `src/router/` | rotas Play, Drill, Range, Villains, Profile e Coach |
| `tests/unit/` | testes por domínio |

O motor em `src/engine/` não depende de Vue e concentra a lógica de poker: quem age, quanto custa, quem ganha cada pote e como cada decisão é avaliada. A interface apenas apresenta.

## Fluxo

1. **Pinte** os ranges por posição (`Ranges`).
2. **Configure** vilões e drill (`Villains`, `Drill`).
3. **Jogue** mãos com relógio (`Play`): cada decisão recebe `+EV` ou `−EV` na hora.
4. **Entenda** o vazamento no `Coach`.
5. **Acompanhe** a evolução no `Profile`.

## Dados

Tudo roda no navegador. Ranges, vilões, drills e histórico ficam no `localStorage`; a configuração completa pode ser exportada e importada em um JSON versionado, validado antes de ser aplicado. O histórico mão a mão segue o formato PokerStars, com opção de cópia como MTT 9-max para análise em solver.

## Decisões

- **Ranges como fonte da verdade**: vilões e nota obedecem à linha pintada. Contra um raise, só a matriz XRFI é lida, e o teto `CALL N` limita o call em big blinds.
- **Pré-flop é aderência, pós-flop é cálculo**: antes do flop a nota compara a ação com a linha pintada; depois dele o EV entra como termo aditivo da nota, sem decidir sozinho.
- **Potes por elegibilidade**: cada side pot vai ao melhor entre os elegíveis, e a aposta não coberta volta ao dono.
- **Tema escuro**: pensado para sessões longas de estudo, com as cores definidas em `src/style.css`.
- **Palco 430×932 com escala proporcional**: o layout da mesa não muda por breakpoint.
- **Testes de intenção**: a suíte Vitest (578 testes em 92 arquivos, 25/11/2026) cobre o formato do histórico e as regras de negócio, não só a renderização.
