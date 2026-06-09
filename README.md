# Bepu Pool 🍼

Baby pool para el bebé de Gretel Seyahian y Adrien Wiedmann.

## Cómo subir a Vercel

### 1. Subir a GitHub

1. Creá un repositorio nuevo en github.com (puede ser privado)
2. Desde tu computadora, en la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Bepu Pool inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/bepu-pool.git
git push -u origin main
```

### 2. Conectar en Vercel

1. Entrá a vercel.com → "Add New Project"
2. Importá el repo `bepu-pool` desde GitHub
3. Dejá todo por defecto y hacé click en **Deploy**

### 3. Activar Vercel KV (base de datos)

1. En tu proyecto en Vercel, ir a la pestaña **Storage**
2. Click en **Create Database** → elegir **KV**
3. Darle un nombre (ej: `bepu-pool-kv`) y crear
4. Vercel conecta automáticamente las variables de entorno al proyecto
5. Hacer un **Redeploy** desde la pestaña Deployments

¡Listo! El link que te da Vercel es el que compartís con todos.

## Estructura

```
bepu-pool/
├── api/
│   └── guesses.js     ← API serverless (GET / POST / DELETE)
├── index.html         ← Frontend
├── vercel.json        ← Configuración de rutas
└── README.md
```

## Funcionalidades

- Cada persona deja su nombre, fecha y peso estimado
- No se puede repetir nombre, fecha ni peso
- Todos ven los pronósticos de todos en tiempo real
- Panel de administración para borrar pronósticos (individuales o todos)
- Se actualiza automáticamente cada 30 segundos
