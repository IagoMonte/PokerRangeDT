# PokerRangeDT

Treinador de ranges 9-max contra vilões que jogam de verdade: você pinta seus ranges, configura os vilões e joga mão atrás de mão com nota imediata em cada decisão.

## Problema

Estudar ranges no papel não transfere para a mesa. Faltava um drill repetitivo de pré-flop e pós-flop que cobrasse cada decisão com relógio e mostrasse onde o dinheiro vaza.

## O que foi construído

- Mesa 9-max com blinds, stacks, side pots, showdown, relógio por decisão e atalhos de teclado (`F` fold, `K` check, `C` call, `R` raise).
- Matriz 13x13 como fonte da verdade: RFI e XRFI pintados por posição, com linhas como `OR`, `3B`, `CALL`, `4B` e tetos de call.
- Cinco presets de vilão (Tight, Balanced, Loose, Station, Maniac) com frequência de open, 3-bet, 4-bet, blefe e call ajustáveis.
- Drills sob medida: só pré-flop, só pós-flop ou full, com tempo por decisão, número de mãos, blinds, stacks e modo Predict.
- Coach com insights sobre as mãos onde houve vazamento e Profile com VPIP, PFR, 3-bet, WTSD, PnL e histórico em formato PokerStars.
- Export e import da configuração completa em JSON, pela página Profile.
- Mobile-first: a mesa é desenhada para o celular e escala proporcionalmente para qualquer tela.

## Como rodar

Requer Node.js 20.19+ (ou 22.12+).

```bash
npm install
npm run dev      # abre na porta 11434
npm test         # suíte Vitest
npm run build    # build de produção em dist/
```

## Próximos passos

- Histórico PokerStars: imprimir a linha de aposta não coberta devolvida e marcar o call que zera o stack como all-in.
- Calibrar a equity de combo draws e a frequência de fold assumida em sessão sem amostra.
- Travar os pesos da nota pós-flop com testes de regressão de estratégia.
- Blefe com blocker no river para os vilões.
- Ampliar a validação do classificador de mãos contra um avaliador de referência.
