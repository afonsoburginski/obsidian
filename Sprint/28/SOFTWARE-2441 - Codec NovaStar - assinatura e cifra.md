---
tags:
  - attlas
  - sprint-28
  - task
  - videowall
card: SOFTWARE-2441
clickup: https://app.clickup.com/t/86ajycedc
titulo: "[Back] Videowall externo: codec NovaStar, assinatura e cifra"
frente: Videowall externo (NovaStar H9)
tamanho: 2 pts
status: Fechado em 17/08 no ClickUp (estava in progress, PR #1598 mergeada em 14/08, golden vectors no CI).
sprint: "[[Attlas - Sprint 28]]"
atualizado: 2026-08-17
---

# SOFTWARE-2441 - Codec NovaStar - assinatura e cifra

A única parte da integração que fecha por inteiro sem acesso ao equipamento.

## Escopo (1 PR)

Assinatura por request (`sign = Base64(MD5(timeStamp + pId))`) e cifra DES (ECB/PKCS5) opcional do
corpo, como funções puras confinadas numa pasta `codec/`, cobertas por golden vectors. Aviso no código
de que MD5 e DES são protocolo imposto pelo fornecedor e nunca reusados para segredo interno do
Attlas. A derivação da chave DES de 8 bytes a partir do `secretKey` não está documentada: fica em
constante marcada como presumida e o modo cifrado nasce desligado, porque o modo sem cifra é o caminho
confirmado.

## DoD

Golden vectors passando, modo cifrado desligado por default, nenhuma dependência do equipamento.

## Dependência

[[SOFTWARE-2201 - Integração videowall externo (NovaStar H9)|2201]], que fixa onde o codec mora no
módulo.

## Referências

- [[Videowall externo (NovaStar H9)]], seção do desenho fechado (item do codec).
- [[Attlas - Sprint 28]], risco 4.
