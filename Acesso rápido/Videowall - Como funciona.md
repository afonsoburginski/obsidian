---
tags:
  - doc
  - cameras
  - videowall
  - explicacao
  - novastar
  - quito
aliases:
  - "Videowall - Como funciona"
  - "Como o videowall funciona"
  - "Câmeras - Videowall - Explicação - Como o videowall funciona"
atualizado: 2026-10-14
---

# Videowall - Como funciona
Por que o vídeo ainda não chega ao painel de Quito:
[[Videowall - Vídeo não chega ao H9]]. Endpoints em
[[Videowall - Endpoints H9]]. Credenciais em [[Videowall - Credenciais H9]].

## Resumo

O videowall é o painel físico da sala de controle de Quito. Quem monta a imagem do painel é um processador
NovaStar H9, que não é do Attlas. O Attlas comanda o H9 pela Open API do fabricante, pela rede, como pede a
cláusula 16.13 do contrato.

O Attlas nunca manda vídeo ao H9. Ele diz ao H9 onde buscar o vídeo, e o H9 puxa esse vídeo do servidor do
Attlas.

## As peças

- **Painel:** os monitores da parede, que formam uma tela de 4992x2808 pixels.
- **Controlador do H9:** a parte do H9 que recebe os comandos (fontes, camadas, brilho). Fica em `10.200.1.52`,
  porta `8000`.
- **Placa de vídeo do H9 (INPUT 7):** a parte do H9 que busca o vídeo pela rede e decodifica. Tem endereços
  próprios na rede de Quito.
- **Servidor de vídeo (MediaMTX):** recebe o vídeo do Attlas e entrega ao H9 por RTSP, em `192.168.10.16:554`, pela VPN de Quito.
- **Attlas (`ms-cameras`):** decide o que vai na parede e comanda o H9.

## Dois jeitos de mostrar algo na parede

**Espelho.** Mostra a tela do operador, do jeito que ele vê no Attlas. Quem dispara é o operador, no botão
Espelhar.

**Projeção de cena.** Mostra as câmeras de uma cena salva, cada uma no seu quadro. Quem dispara é o operador no
VMS, um plano de resposta ou um grupo salvo.

A parede tem um ocupante por vez. Plano de resposta passa na frente de qualquer um. Um operador só tira outro
da parede se tiver perfil administrativo.

## O caminho do vídeo no espelho

1. O operador clica em Espelhar e o navegador pede permissão para capturar a aba.
2. O navegador envia a captura, em H.264, ao servidor de vídeo do Attlas.
3. O Attlas cria no H9 uma **fonte** com o endereço desse vídeo,
   `rtsp://192.168.10.16:554/videowall-mirror-<id>`, com usuário e senha de leitura.
4. O Attlas cria no H9 uma **camada**, o retângulo da parede que mostra a fonte.
5. A placa de vídeo do H9 conecta no endereço, puxa o vídeo e mostra na camada.
6. Ao liberar, ou se a captura parar por 60 segundos, o Attlas apaga a camada e a fonte.

## O caminho do vídeo na projeção de cena

1. O operador envia uma cena ao painel, ou um plano de resposta faz isso sozinho.
2. Para cada câmera da cena, o servidor de vídeo do Attlas prepara um endereço próprio
   (`videowall-projection-<id>`), que só busca a câmera quando alguém pede.
3. O Attlas cria no H9 uma fonte e uma camada por câmera, na posição do layout da cena.
4. A placa de vídeo do H9 puxa cada endereço e mostra cada câmera no seu quadro.

Nos dois modos, endereço e senha da câmera nunca vão ao H9. O H9 só conhece o servidor do Attlas.

## O que o Attlas faz no H9

- Cria e apaga fontes de vídeo (`ipc/IPCSourceCreate`, `ipc/IPCSourceDelete`).
- Cria, move e apaga camadas (`layer/create`, `layer/writeWindow`, `layer/delete`).
- Lê a tela e as camadas (`screen/readList`, `screen/readDetail`, `layer/detailList`).
- Ajusta o brilho (`screen/writeBrightness`), que o firmware 1.9.7.1 de Quito recusa.

O Attlas só mexe no que ele criou: camadas e fontes com nome começando em `attlas-`. O que alguém criar pela
interface do H9 fica intocado.

## Situação em Quito

- **Funciona:** os comandos do Attlas para o H9, e a fonte e a camada que o Attlas cria.
- **Funciona:** as 20 câmeras locais de Quito cadastradas direto no H9, porque estão na mesma rede da placa.
- **Não funciona:** a placa de vídeo puxar o vídeo do servidor do Attlas, porque ela não sai da rede local.
- **Não funciona:** o brilho, que o firmware recusa.

## Palavras usadas

- **H9:** o processador NovaStar que monta a imagem do painel.
- **Fonte:** endereço de vídeo que o H9 usa para preencher uma camada. Na interface do H9 aparece como IPC.
- **Camada:** retângulo do painel que mostra uma fonte.
- **RTSP:** protocolo que a placa usa para puxar o vídeo do servidor.
- **MediaMTX:** servidor de vídeo do Attlas, que recebe a captura e as câmeras e entrega ao H9.
- **Open API:** interface do fabricante pela qual o Attlas comanda o H9.
