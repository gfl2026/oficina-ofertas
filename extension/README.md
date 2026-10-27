# Oficina de Ofertas — Captura rápida (extensão Chrome)

Botão "+ Oficina" em cada card da Biblioteca de Anúncios da Meta. Ele extrai o
que consegue identificar automaticamente (data de início → dias ativo, nome do
anunciante, nº de criativos quando aparece, link de destino, trecho do texto
do anúncio) e abre um painel pra você revisar/completar antes de enviar direto
pro Supabase da Oficina de Ofertas — sem precisar abrir o site nem colar nada
manualmente aqui.

## Como instalar

1. Baixe/extraia esta pasta `extension/` no seu computador.
2. Chrome → `chrome://extensions`.
3. Ative **"Modo do desenvolvedor"** (canto superior direito).
4. Clique **"Carregar sem pacote"** e selecione a pasta `extension/`.
5. Abra a Biblioteca de Anúncios (`facebook.com/ads/library/...`) e pesquise
   normalmente. Cada card vai ganhar um botão verde **"+ Oficina"** no canto
   superior direito.

## Como usar

1. Clique em **"+ Oficina"** no card que quer registrar.
2. Confira/edite os campos no painel que abre (título, nicho, palavra-chave,
   dias ativo, nº de criativos, link do site, link do checkout se tiver, notas).
   O campo **Nicho** sugere os nichos já usados no sistema conforme você digita.
3. Clique **"Salvar no sistema"**. A oferta aparece na Oficina de Ofertas na
   hora, com status "unclassified" pronta pra você classificar.

## Limitações conhecidas (é um scraper de texto, não uma API oficial)

O Facebook não expõe uma API pública pra anúncios comerciais no Brasil, então
a extensão lê o **texto visível** do card (não depende de classes CSS, que o
Facebook ofusca e muda com frequência). Isso funciona bem na maioria dos casos,
mas pode falhar ou vir incompleto em alguns cards — por isso o painel é sempre
editável antes de salvar, igual fazíamos manualmente. Se o Facebook mudar os
textos padrão da interface (ex. "Veiculação iniciada em", "Identificação da
biblioteca:", "Patrocinado"), a extração para de funcionar até eu ajustar o
`content.js` — me avise se isso acontecer, com um print do que mudou.

Campos que a extensão **não tenta adivinhar** (deixa em branco de propósito,
porque não tem como saber com segurança):
- **Link do checkout**: normalmente só aparece depois de clicar no site, não
  no card do anúncio.
- **Nº de criativos total do anunciante**: a extensão só pega o número de
  "X anúncios usam esse criativo e esse texto" quando o Facebook mostra isso
  no próprio card (grupo de duplicados), não o total de criativos ativos da
  conta.
