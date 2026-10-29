# Reglas Estrictas del Proyecto — Gestión de Partes de Trabajo (Fontanería Roma)

## 1. Prohibición de Publicar o Subir a GitHub/Netlify sin Doble Confirmación
- **NUNCA** ejecutes `git push` a GitHub ni comandos de despliegue en Netlify (`netlify deploy`, etc.) por iniciativa propia o sin permiso explícito del usuario.
- El sitio oficial en Netlify (`https://gestionpartestrabajoroma.netlify.app/`) compila automáticamente al recibir un `git push` en el repositorio `https://github.com/jugarbar666/app-partes-trabajo.git`, lo que **consume créditos de la cuenta de Netlify**.
- Todo el desarrollo, corrección de errores, compilación (`npm run build`) y validación (`npm run typecheck`, `npm test`) debe realizarse **exclusivamente en local** hasta que el usuario ordene publicar.

### Protocolo Obligatorio en 2 Pasos para Publicar:
1. **Paso 1 (Orden del usuario):** Espera a que el usuario escriba explícitamente:
   > `"publica esta version"`
2. **Paso 2 (Petición de confirmación del agente):** Antes de ejecutar cualquier `git push` o despliegue, responde pidiendo confirmación explícita al usuario indicando qué ramas se van a actualizar.
3. **Paso 3 (Confirmación final del usuario):** Ejecuta la subida/publicación **únicamente** después de que el usuario responda:
   > `"ok publica"`

## 2. Sitio Único de Netlify y Ramas del Repositorio
- **Único sitio autorizado en Netlify:** `https://gestionpartestrabajoroma.netlify.app/` (Proyecto `gestionpartestrabajoroma`, ID `a289647f-d312-4837-9e95-b7b3fe87941a`, equipo `Fontanería Roma` / `fontaneria-roma`).
- **PROHIBIDO** desplegar o modificar cualquier otro sitio de Netlify (como `partestrabajofontaneria.netlify.app`).
- **Regla de las 3 ramas de GitHub (`pruebas`, `empresa-fontaneria-roma`, `main`):**
  - En la rama **`pruebas`**: deben permanecer siempre activos el selector de cambio de tipo de usuario (Administrador / Operario) y el selector/simulador entre versión de Escritorio y Móvil.
  - En las ramas **`empresa-fontaneria-roma`** y **`main`**: versión operativa de producción con identificación fija del usuario autenticado y sin selectores de prueba.

## 3. Prohibición Estricta de Tocar o Modificar las Bases de Datos en Nuevas Versiones
- **NUNCA** se tocará, sobrescribirá, vaciará, reiniciará ni modificará nada de las bases de datos (`localStorage`, `browserSyncedData.json`, ni registros de clientes, proveedores, artículos, partes, revisiones, cesta de la compra, usuarios o fichajes) al publicar o actualizar nuevas versiones de la aplicación.
- **Los datos pertenecen a los clientes y no a nosotros:** actualizar la versión instalada en un dispositivo (incluyendo pulsar el aviso amarillo de nueva versión disponible) debe actualizar **exclusivamente** el código/interfaz de la aplicación manteniendo intactos el 100% de los datos existentes en la base de datos.
- **Protocolo obligatorio para cualquier cambio en bases de datos:**
  1. Está terminantemente prohibido modificar, añadir, borrar o regenerar datos de la base de datos por iniciativa propia.
  2. Solo se podrá tocar la base de datos si el usuario da una **orden expresa** para ello.
  3. Aun tras recibir la orden expresa del usuario, el agente **debe pedir confirmación explícita** al usuario detallando qué datos se van a tocar y **esperar a recibir dicha confirmación expresa** antes de ejecutar cualquier modificación sobre la base de datos.
