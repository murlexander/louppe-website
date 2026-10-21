Louppe es un visor y organizador de fotos gratuito y de código abierto para Mac. Puede ser una alternativa a ApolloOne si quieres explorar carpetas de fotos y elegir tú cuáles conservar. Abre una carpeta con JPEG, archivos RAW, o ambos, revisa con el teclado, y elige qué conservar. Funciona sin conexión y sin cuenta en macOS 14 o posterior

Estos pasos corresponden a Louppe 1.12. Si tu versión del App Store es anterior, [la versión de GitHub](https://github.com/murlexander/louppe-media-culler/releases/tag/v1.12.0) incluye estos cambios

Creo Louppe para esa primera selección después de una sesión: recorrer las fotografías, decidir cuáles encajan, y conservar los archivos que quieres. Eso puede ser todo el trabajo, aunque nunca edites una fotografía

Si eso es lo que buscas, estas son las diferencias entre Louppe y ApolloOne

## Louppe frente a ApolloOne: ¿qué quieres sustituir?

Las dos aplicaciones permiten explorar carpetas existentes sin importarlas a un catálogo. La pregunta útil es qué quieres hacer después de abrir esa carpeta

| Tu prioridad | Louppe | ApolloOne |
| --- | --- | --- |
| Explorar carpetas sin importar a un catálogo | Sí | Sí |
| Precio y código fuente | Gratis, con código fuente bajo licencia MIT | Una edición gratuita, con ediciones de pago para más funciones |
| Elegir qué fotografías conservar | Decisiones Sí/No con el teclado, estrellas y etiquetas de color opcionales, exportación de las fotos elegidas, y una acción independiente para enviar a la Papelera | Herramientas de visualización y selección dentro de un flujo de trabajo fotográfico más amplio |
| Comparar fotografías | Cuadrícula de miniaturas e inspección individual en Galería | También ofrece comparación de dos imágenes con zoom sincronizado |
| Editar fotografías o metadatos detallados | Usa un editor aparte; Louppe exporta valoraciones mediante archivos auxiliares XMP | Incluye Quick Edit y edición EXIF/IPTC |

Los datos de ApolloOne proceden de [la página de funciones de su desarrollador](https://anogeissus.com/apolloone.html), consultada el 21 de octubre de 2026. Las funciones varían según la edición. Esta es una comparación de flujos de trabajo documentados; no he medido la velocidad de las dos aplicaciones una frente a otra

Si dependes de los mapas, la visualización de puntos de enfoque automático, o las herramientas de edición de ApolloOne, comprueba esas necesidades antes de cambiar. Galería y Cuadrícula de Louppe no sustituyen todas las partes de ese flujo de trabajo

## Prueba Louppe con una carpeta

Empieza con una copia de una sesión pequeña y guarda una copia de seguridad aparte. [Descarga Louppe](/#download), abre la carpeta, y revisa en Galería. Puedes arrastrar una carpeta al icono del Dock o a la ventana de revisión, incluso mientras hay otra carpeta abierta. Louppe guarda tus decisiones antes de cambiar y conserva el tamaño de la ventana

Usa la tecla predeterminada **F** para Sí y **D** para No. Recorre las fotografías con las teclas de flecha. Deja sin decidir las fotos que te generen dudas o añade estrellas con **1–5** para otra pasada. Las estrellas y las decisiones Sí/No son independientes

En **Ajustes → Atajos de teclado**, puedes personalizar las teclas de revisión o usar posiciones físicas para distribuciones como Dvorak. Las teclas de esta guía son las predeterminadas

**Marcar No no elimina un archivo ni lo envía a la Papelera**. Limpiar es una acción independiente que envía archivos no deseados a la Papelera de macOS. Tus decisiones se guardan automáticamente para que puedas volver a abrir la carpeta y continuar

![Galería de Louppe con una fotografía, un explorador de miniaturas, y datos de la cámara](/media/2026-09-26/gallery-info.webp)

<!-- try-louppe -->

## Revisa las alternativas y después comprueba los detalles

Pulsa **G** para ir a Cuadrícula y ver juntas las fotos cercanas. Vuelve a Galería y usa **S** para examinar la fotografía actual al 100% centrado; púlsala de nuevo para Ajustar

Si solo disparas en JPEG, revisa esos archivos directamente. No necesitas archivos RAW ni una aplicación de edición. Para los JPEG de Fuji con metadatos de simulación de película registrados, **Filtrar → Simulación de película** permite revisar un aspecto de una serie de horquillado mientras las fotografías ocultas conservan sus decisiones

En Ajustar y vista de tamaño móvil, un indicador muestra si la vista previa de la foto sigue cargando. Espera a que termine antes de evaluar el enfoque

Para los archivos RAW, la visualización Rápido usa vistas previas por debajo del 100% y el revelado RAW de Apple al 100% o más. Ese revelado puede diferir del JPEG de la cámara o del de tu editor. Comprueba el propio JPEG cuando importe el aspecto terminado de la cámara

Si disparas en RAW + JPEG, puedes agrupar los archivos correspondientes como un solo elemento de revisión o revisarlos por separado. La [guía de RAW + JPEG](/blog/cull-raw-jpeg-pairs-mac/) explica el emparejamiento, las decisiones independientes, y qué archivos se copian

Las fotos, el vídeo, el audio, y el texto de solo lectura pueden compartir una carpeta de revisión. Puede ser útil cuando una sesión contiene algo más que fotografías

## Termina tu selección

Puedes terminar con tus fotografías en la misma carpeta o copiar las elegidas a otro lugar. Para quitar los descartes, revisa el alcance en Limpiar antes de confirmar el envío a la Papelera. **⌘Z** permite restaurar el lote durante la sesión abierta mientras los archivos sigan en la Papelera

Abre Exportar con **E** o **⌘E**, deja **Copiar** seleccionado, y comprueba el alcance y el número de coincidencias. Con una selección activa, Exportar empieza con **Todos seleccionados**; de lo contrario, empieza con **Aceptadas (Sí)** del filtro actual, las fotos marcadas Sí

Copia los archivos elegidos a una carpeta para las fotos que quieras conservar. Copiar deja los archivos de origen en su sitio; Trasladar mueve los originales. Comprueba el destino en Finder antes de usar o compartir los archivos copiados

Si el siguiente paso es editar, sigue con Lightroom Classic, Capture One, darktable, o el editor que ya te sirva. La [guía para seleccionar fotos antes de Lightroom](/blog/cull-photos-mac-before-lightroom/) explica cómo llevar la selección al editor

Copiar solo las fotografías no transfiere las estrellas ni las etiquetas de color. La exportación de metadatos XMP es un paso aparte que debes comprobar con tu editor. Antes de cambiar el flujo de una sesión existente, prueba con una copia de su carpeta y comprueba qué decisiones se transfieren

## ¿Es Louppe la alternativa a ApolloOne que necesitas?

Prueba Louppe si quieres hacer tus propias selecciones, trabajar con carpetas locales, y conservar las fotografías que elijas mediante una aplicación gratuita y de código abierto

Comprueba primero los requisitos: **Apple silicon y macOS 14 o posterior**. Louppe no es compatible con Macs Intel, Windows, ni iPad. No edita fotografías ni decide automáticamente qué imágenes debes conservar

Puedes [ver la demostración breve](/#review-demo) y después probar la misma carpeta en las dos aplicaciones. La comparación útil es si puedes hacer tu selección, volver a ella, y terminar con los archivos que querías conservar
