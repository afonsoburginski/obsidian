---
id: S34-13
tags:
  - attlas
  - task
  - sprint-34
  - ms-cameras
  - videowall
  - frontend
titulo: "[Front] Videowall - endereço de rede e porta do painel seguem o padrão de validação do sistema"
frente: Câmeras
tamanho: 5 pts
pr: "#4152"
issues: "#2824, #3119"
status: "Feita. PR #4152 mergeada na develop em 22/09, às 21h56, fechando as issues 2824 e 3119."
sprint: "[[Attlas - Sprint 34]]"
atualizado: 2026-09-23
aliases:
  - "Videowall - endereço de rede e porta validados"
---

# S34-13 - Câmeras - Videowall - Endereço de rede e porta validados

O mesmo par de campos aparece na aba "Configuração" do painel físico e na etapa "Endereço" do
assistente de conexão. Nos dois lugares "Endereço de rede" era texto livre e aceitava "teste 123 ABC",
e a porta aceitava treze dígitos. A única barreira era o botão de salvar desabilitado em silêncio.
Fecha as issues 2824 e 3119.

## O que muda

O endereço passa a usar o mesmo validador de IPv4 e a mesma máscara do passo de dispositivo de
câmeras. A porta leva faixa mínima e máxima vindas da constante compartilhada, com o valor digitado
permanecendo à vista enquanto a mensagem explica a faixa, em vez de ser reescrito em silêncio. A
cópia local dos limites saiu.

A mensagem por campo vem de uma função pura, consumida pelas duas telas, para a regra não divergir
entre cadastro e edição. Campo intocado fica mudo, para o formulário não abrir vermelho. Os botões
passam a refletir validade, mas nenhum deles é a única sinalização: as etapas seguintes do assistente
também ganharam mensagem inline, senão o botão desabilitado só mudaria de lugar.

Na aba "Configuração" o formulário parte preenchido pelo servidor, então os campos entram marcados
como tocados de propósito: um endereço gravado antes da regra existir explica por que "Salvar" está
bloqueado.

## O que tem de valer no fim

Endereço inválido e porta fora da faixa são recusados com mensagem que nomeia o campo e o motivo, nas
duas telas, nos quatro idiomas.

## Relacionado

- [[S34-33 - Câmeras - Issues - As issues abertas do módulo]], a frente em que esta task entra.
