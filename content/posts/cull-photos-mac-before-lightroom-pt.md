Você pode selecionar suas fotos antes de importar no Lightroom: abra uma pasta no Louppe, marque as imagens que quer manter, e copie essa seleção para uma pasta de edição. O Louppe é um aplicativo gratuito e de código aberto para selecionar fotos em Macs com Apple silicon e macOS 14 ou posterior. A revisão funciona offline, sem conta, e sem importar as fotos para um catálogo

O mesmo fluxo de trabalho com pastas funciona com Capture One e darktable. Você escolhe as fotografias no Louppe e depois leva a seleção para o seu editor

Selecionar fotos significa escolher com quais fotografias seguir. Pode ser tão simples quanto separar as que você quer manter dos disparos acidentais, das fotos fora de foco, e das alternativas quase idênticas

Aqui está uma primeira revisão que você pode usar no seu próximo ensaio

## Comece com uma pasta de fotos

Copie o ensaio do cartão de memória para uma pasta no Mac e mantenha um backup antes de esvaziar o cartão. Você pode abrir um cartão diretamente no Louppe, mas uma decisão de revisão não é um backup

[Obtenha o Louppe na Mac App Store](https://apps.apple.com/app/louppe/id6820131477). [Também está disponível no GitHub e no Homebrew](/#download). Abra uma pasta no Louppe ou arraste-a para o ícone no Dock ou para a janela de revisão. Você pode trocar de pasta durante a revisão; o Louppe salva suas decisões e mantém o tamanho da janela

O Louppe revisa os arquivos onde eles estão. Não há uma biblioteca separada para a qual importá-los

## Tome uma decisão por foto

Os atalhos deste guia são os padrões. Em Ajustes → Atalhos de teclado, você pode personalizar as teclas de revisão e escolher posições físicas para layouts como Dvorak

Comece na Galeria e percorra o ensaio com as teclas de seta. Pressione **F** para Sim quando uma fotografia deve fazer parte da sua edição, ou **D** para Não quando ela não deve entrar

Nesta revisão, pergunte se há um motivo para manter a fotografia. A expressão funciona? O assunto está em foco? Existe uma foto melhor do mesmo momento? Deixe sem decisão as fotografias que gerarem dúvida e volte a elas depois

**“Não” é uma decisão de revisão. Não exclui a fotografia nem a envia para a Lixeira**

![Galeria do Louppe mostrando uma fotografia, um navegador de miniaturas, e o painel de informações com as configurações da câmera e um histograma](/media/2026-09-26/gallery-info.webp)

O Louppe salva as decisões automaticamente. Espere o salvamento terminar antes de fechar a pasta; reabra a mesma pasta para continuar depois

<!-- try-louppe -->

## Compare fotos semelhantes e depois confira os detalhes

Pressione **G** para mudar para a Grade quando quiser ver fotografias próximas juntas. Compare a composição e o momento, depois volte à Galeria para olhar de perto

Use **S** para examinar uma fotografia em 100%. Se você já ampliou ou deslocou a imagem, S primeiro retorna a 100% centralizado; ao pressionar novamente, retorna a Ajustar. Confira o detalhe que importa para a foto, como o olho mais próximo em um retrato

Para arquivos RAW, o modo de exibição Rápido (Fast) do Louppe usa prévias abaixo de 100% e a renderização RAW da Apple em 100% ou mais. A renderização RAW pode parecer diferente do JPEG da câmera ou da renderização do Lightroom, então deixe os ajustes finais de cor e exposição para o seu editor

As estrelas são opcionais. Pressione **1–5** para classificar uma fotografia se precisar de um segundo nível de seleção. As estrelas e as decisões Sim/Não são independentes: cinco estrelas não marcam uma fotografia como Sim também

Se você fotografa nos dois formatos, [revise os pares RAW + JPEG correspondentes juntos](/blog/cull-raw-jpeg-pairs-mac/) para que cada tomada ocupe um só lugar na revisão

![Sete fotos marcadas como Sim na grade do Louppe](/media/2026-10-22-canada/keepers-grid.webp)

*Seleção filtrada por Sim, capturada no Louppe 1.9*

## Copie as fotos escolhidas para uma pasta de edição

Abra Exportar com **E** ou **⌘E** e mantenha **Copiar** selecionado. Escolha o escopo e as decisões que quer incluir, depois confira a contagem de correspondências antes de escolher um destino

Essa conferência importa: com uma seleção ativa, Exportar começa com **Todos os selecionados**. Sem uma seleção, começa com **Keepers (Yes)** do filtro atual, as fotos marcadas Sim. Uma seleção ou um filtro ativo pode mudar quais fotografias serão incluídas

Copie para uma pasta com um nome claro, como `Shoot name/Keepers`. Copiar deixa os arquivos de origem onde estão. **Mover** transfere os originais, então use Copiar neste fluxo de trabalho

O resultado é uma pasta com as fotografias que você escolheu para editar. Você pode conferir a pasta no Finder antes de abrir seu editor

![Prévia de cópia do Louppe com sete fotos e catorze arquivos emparelhados](/media/2026-10-22-canada/copy-keepers.webp)

*Prévia de cópia no Louppe 1.9: sete pares são catorze arquivos. A exportação ainda não foi executada*

## Importe essa pasta no Lightroom Classic

No Lightroom Classic, escolha **Arquivo → Importar fotos e vídeo** e selecione a pasta com as fotos escolhidas como origem

Escolha **Adicionar** se a pasta já estiver onde você quer guardar essas fotografias. Escolha **Copiar** se o Lightroom deve copiá-las para outro local de armazenamento e confira o destino antes de importar. O [guia de importação da Adobe](https://helpx.adobe.com/lightroom-classic/desktop/import-photos/import-photos-video-catalog.html) explica essas opções

Agora você pode começar a editar as fotos escolhidas enquanto o restante do ensaio continua na pasta de origem

## Use Capture One ou darktable

No **Capture One (C1)**, escolha **Arquivo → Importar imagens…** e selecione a pasta com as fotos escolhidas como origem. Confira a opção de armazenamento antes de importar. Se estiver usando um catálogo, você pode referenciar os arquivos no local em que já estão; o [guia de importação do Capture One](https://support.captureone.com/hc/en-us/articles/360002492617-Importing-images-into-a-Catalog) explica as opções

O **darktable** é um editor RAW gratuito e de código aberto com [versões para macOS, incluindo Apple silicon](https://www.darktable.org/install/). Ele oferece a etapa de edição para um fluxo de trabalho fotográfico gratuito e de código aberto no Mac

Na vista mesa de luz do darktable, use **adicionar à biblioteca (add to library)** para selecionar as fotos escolhidas. Isso adiciona os arquivos existentes à biblioteca sem copiá-los nem movê-los. O [guia de importação do darktable](https://docs.darktable.org/usermanual/5.6/en/overview/workflow/import-review/) explica como essa opção difere de **copiar e importar (copy & import)**

Nos três editores, esse fluxo de trabalho entrega sua seleção por meio dos arquivos que você copiou. Copiar apenas as fotografias não transfere as estrelas nem as etiquetas de cor do Louppe. O Louppe também oferece exportação de metadados XMP, uma transferência separada que você deve conferir com seu editor e seus formatos de arquivo

## Um app separado para selecionar fotos é útil para você?

Se você quer todas as fotos no catálogo do Lightroom, revisá-las lá talvez já funcione bem. Uma revisão separada é útil quando você quer escolher as fotografias primeiro, trabalhar diretamente com pastas, ou revisar sem conexão com a internet

O Louppe não distingue o tipo de mídia: fotos, vídeo, áudio, e texto somente para leitura podem compartilhar a mesma revisão. As mesmas decisões, estrelas, e etiquetas de cor funcionam em um ensaio ou arquivo com diferentes tipos de mídia

Você também tem controle direto sobre as pastas locais: filtre e selecione arquivos, copie ou mova as fotos escolhidas, renomeie arquivos, e organize a pasta de origem com uma prévia da nova hierarquia. Exportar copia por padrão

O Louppe não edita fotografias nem escolhe automaticamente quais manter. Ele oferece Galeria, Grade, decisões pelo teclado, e exportação de arquivos para que você faça a escolha

Você pode [assistir à demonstração curta](/#review-demo) antes de abrir um ensaio. Se algo no seu fluxo de trabalho não se encaixar, [me escreva](mailto:a@alex-markin.com)
