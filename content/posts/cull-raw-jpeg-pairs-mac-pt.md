Quando você fotografa em RAW + JPEG, um toque no disparador cria dois arquivos. No Louppe, você pode revisar um par correspondente como uma só foto, aplicar uma decisão aos dois arquivos, e copiar o par junto. Desative o agrupamento quando quiser avaliar o RAW e o JPEG separadamente

O Louppe é um aplicativo gratuito e de código aberto para selecionar mídia em Macs com Apple silicon e macOS 14 ou posterior. Sua revisão fica no Mac e funciona offline

## O que conta como um par RAW + JPEG?

Uma câmera pode gerar `DSCF0123.RAF` e `DSCF0123.JPG`: um arquivo RAW e um JPEG com o mesmo nome base. São duas versões de uma tomada, em vez de duas cópias do mesmo arquivo

O Louppe agrupa arquivos RAW + JPEG correspondentes sem ambiguidade. Ele não forma pares de fotografias pela semelhança visual. Quando mais de um RAW ou JPEG pode corresponder, os arquivos continuam separados

Comece com uma pasta copiada do cartão da câmera, com um backup mantido separadamente. Preservar os nomes de arquivo da câmera facilita acompanhar a relação

## Revise cada tomada uma vez

Os atalhos deste guia são os padrões. Em Ajustes → Atalhos de teclado, você pode personalizar as teclas de revisão e escolher posições físicas para layouts como Dvorak

1. Abra a pasta no Louppe
2. Abra **Filtrar** e ative **Tratar RAW + JPEG correspondentes como uma única foto (Treat matching RAW + JPEG as one photo)** quando houver pares correspondentes
3. Revise na Galeria, ou pressione **G** para a Grade
4. Pressione **F** para Sim ou **D** para Não enquanto percorre o ensaio

Com o agrupamento ativado, uma classificação ou ação sobre um item se aplica aos dois arquivos. Isso inclui decisões Sim/Não, estrelas, e etiquetas de cor. Marcar Não não envia nenhum dos arquivos para a Lixeira

![Galeria do Louppe com o agrupamento RAW + JPEG visível ao lado dos controles de revisão](/media/2026-09-26/gallery-info.webp)

O agrupamento muda como você revisa o par. O RAW e o JPEG continuam sendo arquivos separados no disco, e o Louppe mantém suas classificações individuais

<!-- try-louppe -->

## Decida se quer as duas versões

Às vezes o JPEG da câmera está pronto para compartilhar, enquanto vale a pena manter o RAW para editar depois. Às vezes só uma versão deve entrar na sua seleção

Nesses casos, desative **Tratar RAW + JPEG correspondentes como uma única foto (Treat matching RAW + JPEG as one photo)**. Revise os arquivos separadamente e dê a cada um a decisão que quiser. Por exemplo, marque o JPEG como Sim para uma seleção imediata e deixe o RAW sem decisão para uma revisão posterior

Ativar o agrupamento novamente não apaga essas decisões separadas. Se os dois arquivos tiverem decisões diferentes, o par pode mostrar uma decisão **Misto**. Revise antes de exportar, em vez de presumir que os dois arquivos têm a mesma marca

Se quiser manter decisões independentes, continue no modo separado. Aplicar uma nova decisão a um par agrupado volta a aplicá-la aos dois arquivos

## Confira o foco e a origem da prévia

Um arquivo RAW e o JPEG da câmera podem parecer diferentes. O JPEG contém a renderização da câmera; um decodificador RAW faz sua própria renderização

No modo de exibição Rápido (Fast) do Louppe, as fotos RAW usam prévias abaixo de 100% e a renderização RAW da Apple em 100% ou mais. Pressione **S** para examinar em 100% centralizado; pressione novamente para Ajustar. as preferências de exibição RAW ficam em Ajustes → Visualização RAW. em Ajustar e prévia do tamanho de um celular, um indicador mostra quando a prévia da foto ainda está carregando

Para decidir sobre a cor ou a aparência do JPEG da câmera, mude para o modo separado e abra o próprio JPEG. Deixe a edição final do RAW para seu editor, cuja renderização pode diferir da do Louppe

## Copie os arquivos que você realmente quer

Abra Exportar com **E** ou **⌘E**, escolha **Copiar**, e confira o escopo, as decisões, e a contagem de correspondências

Quando você inclui um par agrupado, os dois arquivos são copiados. Uma foto na revisão pode, portanto, significar dois arquivos no destino

Para uma seleção com apenas uma versão, use o modo separado e primeiro selecione ou filtre os arquivos que quer. Confira Exportar novamente: uma seleção ativa começa com **Todos os selecionados**, enquanto a ausência de seleção começa com **Keepers (Yes)** do filtro atual, as fotos marcadas Sim

Experimente o fluxo de trabalho com alguns pares primeiro, depois abra o destino no Finder e confira se os nomes de arquivo e os formatos correspondem ao que você queria. Mantenha a pasta de origem e o backup até verificar o resultado

## Agrupar pares não é remover duplicatas

Um RAW e um JPEG com o mesmo nome não são duplicatas intercambiáveis. Mantenha os dois se precisar da imagem finalizada da câmera e da flexibilidade de editar um RAW

Você não precisa usar Limpar para terminar a seleção. Deixe os arquivos indesejados marcados como Não se ainda estiver decidindo o que arquivar. Limpar é uma ação separada que envia arquivos para a Lixeira do macOS; revise seu escopo antes de confirmar

Para o próximo passo, [copie as fotos escolhidas para uma pasta de edição](/blog/cull-photos-mac-before-lightroom/). O guia cobre Lightroom Classic, Capture One (C1), e darktable.

[Assista à demonstração curta do Louppe](/#review-demo), ou [me conte como você trabalha com RAW + JPEG](mailto:a@alex-markin.com)
