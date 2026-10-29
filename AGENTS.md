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
