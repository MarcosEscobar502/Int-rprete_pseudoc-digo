# Validador de Pseudocódigo UMG (100% Node.js)

Basado en el enunciado del PDF del proyecto de Autómatas 2025. Valida:
- funciones
- parámetros (válidos / inválidos)
- asignaciones dentro de <codigo>
- bloques <if> con <condicion> y <codigo>
- bloques <do> con <codigo> y <condicion>
- condiciones con and / or y operadores relacionales
- cuenta errores léxicos y sintácticos

Fuente del enunciado: Proyecto autómatas 2025.pdf (UMG). fileciteturn1file0L31-L42

## Ejecutar API + web

```bash
npm install
npm start
# abre en http://localhost:3000
```

## Probar por CLI

```bash
node src/index.js inputs/prueba1.txt
```

## Endpoints

- `POST /api/validate` (form-data, campo `file`)
- `GET /api/validate/all` → corre los 6 txt de prueba y devuelve todos los reportes.

