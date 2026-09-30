# Prolog Fácil

Una aplicación web pequeña, en español y sin framework de interfaz, para aprender a formular consultas con **SWI-Prolog**.

## Arquitectura y decisiones

La primera versión se divide deliberadamente en tres piezas:

1. **Interfaz HTML/CSS/JavaScript:** un único flujo numerado (ejemplo → programa → consulta → resultados), accesible también desde móvil. No hay compilador ni dependencias de frontend que mantener.
2. **Servidor HTTP Node.js:** valida tamaños y límites, sirve los archivos estáticos y crea un proceso nuevo por consulta. Node usa únicamente su biblioteca estándar.
3. **Adaptador SWI-Prolog:** carga las cláusulas en un módulo separado, comprueba la consulta con `library(sandbox)` y devuelve JSON. Cada ejecución usa un directorio temporal, un entorno mínimo, sin paquetes ni hilos, y el servidor mata el proceso al cancelar o superar el tiempo.

Se asume un uso educativo local y de una sola persona. La sandbox de SWI-Prolog reduce las operaciones accesibles, pero no sustituye el aislamiento de un contenedor para exponer el servicio a Internet. En producción se recomienda ejecutar todo el servidor como usuario sin privilegios dentro de un contenedor con red, sistema de archivos y recursos restringidos.

## Requisitos y arranque

- Node.js 20 o posterior.
- SWI-Prolog 9.x (`swipl` disponible en `PATH`). En Debian/Ubuntu: `sudo apt install swi-prolog-nox`.

```bash
npm start
```

Abre <http://127.0.0.1:3000>. Se puede cambiar la dirección con `HOST`, `PORT` y la ruta al ejecutable con `SWIPL_PATH`:

```bash
HOST=0.0.0.0 PORT=8080 SWIPL_PATH=/usr/bin/swipl npm start
```

## Uso

1. Elige uno de los ejemplos o carga un archivo `.pl` de hasta 100 KB.
2. Modifica los hechos y reglas. Por seguridad, esta versión no admite directivas `:- ...`.
3. Escribe la consulta sin `?-` (el punto final es opcional), ajusta los límites si lo necesitas y pulsa **Ejecutar**.
4. Revisa cada solución y sus variables. **Detener** cancela la petición y mata el proceso aislado.

## Pruebas

```bash
npm test
```

La suite cubre una, varias y cero soluciones, sintaxis inválida, cancelación, límite temporal, validación y el contrato HTTP. Usa un motor doble determinista para poder probar el control de procesos aun donde SWI-Prolog no esté instalado. El ejemplo **Recursión** funciona como revisión representativa de rendimiento: el límite de resultados controla la salida y el límite temporal protege frente a ciclos o espacios de búsqueda costosos.
