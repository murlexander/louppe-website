Cuando disparas en RAW + JPEG, cada pulsación del disparador crea dos archivos. En Louppe puedes revisar un par correspondiente como una sola foto, aplicar una decisión a ambos archivos, y copiar el par junto. Desactiva la agrupación cuando quieras evaluar el RAW y el JPEG por separado

Louppe es una aplicación gratuita y de código abierto para seleccionar medios en Mac con Apple silicon y macOS 14 o posterior. La revisión se queda en tu Mac y funciona sin conexión

## ¿Qué se considera un par RAW + JPEG?

Una cámara puede generar `DSCF0123.RAF` y `DSCF0123.JPG`: un archivo RAW y un JPEG con el mismo nombre base. Son dos versiones de una toma, no dos copias del mismo archivo

Louppe agrupa los archivos RAW + JPEG correspondientes cuando no hay ambigüedad. No empareja fotografías por su parecido visual. Cuando puede haber más de un RAW o JPEG correspondiente, los archivos permanecen separados

Empieza con una carpeta copiada de la tarjeta de la cámara y guarda una copia de seguridad aparte. Conservar los nombres de archivo de la cámara facilita seguir la relación

## Revisa cada toma una sola vez

Los atajos de esta guía son los predeterminados. En Ajustes → Atajos de teclado, puedes personalizar las teclas de revisión y elegir posiciones físicas para distribuciones como Dvorak

1. Abre la carpeta en Louppe
2. Abre **Filtrar** y activa **Trate de combinar RAW + JPEG como una foto (Treat matching RAW + JPEG as one photo)** cuando haya pares correspondientes
3. Revisa en Galería o pulsa **G** para ir a Cuadrícula
4. Pulsa **F** para Sí o **D** para No mientras recorres la sesión

Con la agrupación activada, una valoración o acción sobre un elemento se aplica a ambos archivos. Esto incluye las decisiones Sí/No, las estrellas, y las etiquetas de color. Marcar No no envía ninguno de los dos archivos a la Papelera

![Archivos RAW + JPEG agrupados en una miniatura por toma](/media/2026-10-22-canada/pairs-grouped.webp)

*Agrupación activada: una miniatura por toma, capturada en Louppe 1.9*

La agrupación cambia cómo revisas el par. El RAW y el JPEG siguen siendo archivos separados en el disco, y Louppe conserva sus valoraciones individuales

<!-- try-louppe -->

## Decide si quieres las dos versiones

A veces el JPEG de la cámara está listo para compartir, mientras que merece la pena conservar el RAW para editarlo más adelante. Otras veces solo una versión debe formar parte de tu selección

En esos casos, desactiva **Trate de combinar RAW + JPEG como una foto (Treat matching RAW + JPEG as one photo)**. Revisa los archivos por separado y asigna a cada uno la decisión que quieras. Por ejemplo, marca el JPEG como Sí para una selección inmediata y deja el RAW sin decidir para una pasada posterior

Volver a activar la agrupación no borra esas decisiones por separado. Si los dos archivos tienen decisiones distintas, el par puede mostrar una decisión **Mixto**. Revísalo antes de exportar en vez de dar por hecho que ambos archivos tienen la misma marca

Si quieres mantener decisiones independientes, sigue en el modo separado. Aplicar una nueva decisión a un par agrupado vuelve a aplicarla a ambos archivos

![Archivos RAW y JPEG como miniaturas separadas con sus extensiones](/media/2026-10-22-canada/pairs-separate.webp)

*Agrupación desactivada: una miniatura por archivo, capturada en Louppe 1.9*

## Comprueba el enfoque y el origen de la vista previa

Un archivo RAW y el JPEG de su cámara pueden verse distintos. El JPEG contiene el revelado de la cámara; un decodificador RAW crea su propio revelado

En la visualización Rápido de Louppe, las fotos RAW usan vistas previas por debajo del 100% y el revelado RAW de Apple al 100% o más. Pulsa **S** para examinar al 100% centrado; púlsala de nuevo para volver a Fit, el ajuste a la ventana. las preferencias de visualización RAW están en Ajustes → Visualización RAW. en Ajustar y vista de tamaño móvil, un indicador muestra si la vista previa de la foto sigue cargando

Para decidir sobre el color o el aspecto del JPEG de la cámara, cambia al modo separado y abre el propio JPEG. Deja la edición final del RAW para tu editor, cuyo revelado puede diferir del de Louppe

## Copia los archivos que realmente quieras

Abre Exportar con **E** o **⌘E**, elige **Copiar**, y comprueba el alcance, las decisiones, y el número de coincidencias

Cuando incluyes un par agrupado, se copian los dos archivos. Por tanto, una foto en la revisión puede equivaler a dos archivos en el destino

Para una selección que solo contenga una versión, usa el modo separado y selecciona o filtra primero los archivos que quieras. Comprueba de nuevo Exportar: con una selección activa empieza con **Todos seleccionados**, mientras que sin selección empieza con **Keepers (Yes)** del filtro actual, las fotos marcadas Sí

Prueba primero el flujo de trabajo con unos pocos pares, después abre el destino en Finder y comprueba que los nombres de archivo y los formatos coincidan con lo que querías. Conserva la carpeta de origen y la copia de seguridad hasta verificar el resultado

![Vista previa de copia de Louppe con siete fotos y catorce archivos emparejados](/media/2026-10-22-canada/copy-keepers.webp)

*Vista previa de copia en Louppe 1.9: siete pares son catorce archivos. La copia aún no se ha ejecutado*

## Agrupar pares no es eliminar duplicados

Un RAW y un JPEG con el mismo nombre no son duplicados intercambiables. Conserva los dos si necesitas la imagen terminada de la cámara y la flexibilidad de editar un RAW

No necesitas usar Limpiar para terminar una selección. Deja los archivos que no quieras marcados como No si todavía estás decidiendo qué archivar. Limpiar es una acción aparte que envía archivos a la Papelera de macOS; revisa su alcance antes de confirmarla

Para el siguiente paso, [copia las fotos elegidas a una carpeta para editarlas](/blog/cull-photos-mac-before-lightroom/). La guía cubre Lightroom Classic, Capture One (C1), y darktable.

[Mira la demostración breve de Louppe](/#review-demo), o [cuéntame cómo trabajas con RAW + JPEG](mailto:a@alex-markin.com)
