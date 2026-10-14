# Graph Report - brujula  (2026-10-14)

## Corpus Check
- 65 files · ~27,803 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .csv 6, (none) 3, .css 3)

## Summary
- 430 nodes · 935 edges · 21 communities (17 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f7ecbd6d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App
- App.tsx
- package.json
- Nuevo.tsx
- import.ts
- accountName
- Roadmap de Brújula
- sw.test.mjs
- compilerOptions
- Auditoría de registro, duplicados y seguridad — 18/09/2026
- Auditoría de importación de extractos — 18/09/2026
- Fase 7 · Registro de publicación gradual
- Diseño fase 3 · Portada y navegación
- Temas de Brújula
- Copias de seguridad de Brújula
- Publicación del 19 de septiembre de 2026
- Acceso a Brújula
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `App()` - 72 edges
2. `money()` - 32 edges
3. `Nuevo()` - 23 edges
4. `accountName()` - 21 edges
5. `AccountsPanel()` - 19 edges
6. `react` - 17 edges
7. `compilerOptions` - 16 edges
8. `InvestmentsPanel()` - 15 edges
9. `change()` - 15 edges
10. `synchronize()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Antes de admitir mucho tráfico` --references--> `synchronize()`  [INFERRED]
  ARCHITECTURE.md → src/ledger.ts
- `Cuándo valorar Next.js` --references--> `synchronize()`  [INFERRED]
  ARCHITECTURE.md → src/ledger.ts
- `Primera medición y modularización (26-09-2026)` --references--> `synchronize()`  [INFERRED]
  ARCHITECTURE.md → src/ledger.ts
- `emptyForm()` --calls--> `localDate()`  [EXTRACTED]
  src/App.tsx → src/data.ts
- `App()` --calls--> `merchantFor()`  [EXTRACTED]
  src/App.tsx → src/categorize.ts

## Import Cycles
- None detected.

## Communities (21 total, 4 thin omitted)

### Community 0 - "App"
Cohesion: 0.06
Nodes (59): Antes de admitir mucho tráfico, Arquitectura y crecimiento de Brújula, Cuándo valorar Next.js, Decisión provisional de framework, Módulos actuales, Primera medición y modularización (26-09-2026), App(), changeTheme() (+51 more)

### Community 1 - "App.tsx"
Cohesion: 0.08
Nodes (38): shiftMonth(), Tab, AccountSetting, AccountType, Budget, CATEGORIES, Category, Goal (+30 more)

### Community 2 - "package.json"
Cohesion: 0.05
Nodes (39): dependencies, animejs, lucide-react, papaparse, react, react-dom, read-excel-file, @supabase/supabase-js (+31 more)

### Community 3 - "Nuevo.tsx"
Cohesion: 0.11
Nodes (43): formatDate(), money(), monthLabel(), DailyChart(), asentarAguja(), entrar(), motor(), Parar (+35 more)

### Community 4 - "import.ts"
Cohesion: 0.11
Nodes (30): papaparse, read-excel-file, categoryFor(), clean(), merchantFor(), MERCHANTS, Transaction, ImportDialog() (+22 more)

### Community 5 - "accountName"
Cohesion: 0.12
Nodes (28): lucide-react, react, CASH_DENOMINATIONS, CashCounts, cashTotalCents(), validCashCounts(), accountName(), AccountBalances (+20 more)

### Community 6 - "Roadmap de Brújula"
Cohesion: 0.06
Nodes (33): Acceso rápido desde iPhone, Activar cuentas y sincronización, Brújula — finanzas personales, Contabilidad, Estructura, Importación, Probar en local, Publicar y volver atrás (+25 more)

### Community 7 - "sw.test.mjs"
Cohesion: 0.07
Nodes (7): assets, files(), manifest, version, file(), parse(), transaction

### Community 8 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+9 more)

### Community 9 - "Auditoría de registro, duplicados y seguridad — 18/09/2026"
Cohesion: 0.25
Nodes (7): Actualización: acceso por código, Alcance y verificaciones, Auditoría de registro, duplicados y seguridad — 18/09/2026, Bloqueos y riesgos pendientes, Comprobaciones de base de datos, Decisión sobre límites de intentos, Hallazgos corregidos

### Community 10 - "Auditoría de importación de extractos — 18/09/2026"
Cohesion: 0.33
Nodes (5): Auditoría de importación de extractos — 18/09/2026, Estado del informe externo, Límites pendientes, Problemas detectados y correcciones, Seguridad y contabilidad

### Community 11 - "Fase 7 · Registro de publicación gradual"
Cohesion: 0.33
Nodes (5): Decisión de producto · 27-09-2026, Fase 7 · Registro de publicación gradual, Puertas pendientes antes de publicar cambios visuales en `main`, Tutorial de Ultra y decisión de niveles (27-09-2026), Versión de pruebas del 27-09-2026

### Community 12 - "Diseño fase 3 · Portada y navegación"
Cohesion: 0.40
Nodes (4): Criterios visuales, Diseño fase 3 · Portada y navegación, Estados y revisión, Mapa

### Community 13 - "Temas de Brújula"
Cohesion: 0.40
Nodes (4): Antes de producción, Detalles técnicos, Qué hay, Temas de Brújula

### Community 14 - "Copias de seguridad de Brújula"
Cohesion: 0.50
Nodes (3): Copias de seguridad de Brújula, Crear una copia en un ordenador de confianza, Verificar una restauración

### Community 15 - "Publicación del 19 de septiembre de 2026"
Cohesion: 0.50
Nodes (3): Publicación del 19 de septiembre de 2026, Revertir el frontend sin borrar historial, Versiones de Brújula y recuperación

### Community 16 - "Acceso a Brújula"
Cohesion: 0.50
Nodes (3): Acceso a Brújula, Enlaces y entrega de correo, Google OAuth

## Knowledge Gaps
- **5 isolated node(s):** `@types/papaparse`, `@types/react`, `@types/react-dom`, `typescript`, `vite`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 183 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `App` to `App.tsx`, `package.json`, `Nuevo.tsx`, `import.ts`, `accountName`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `App()` (e.g. with `deleteBudget()` and `deleteGoalLocal()`) actually correct?**
  _`App()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/papaparse`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App` be split into smaller, more focused modules?**
  _Cohesion score 0.05669710806697108 - nodes in this community are weakly interconnected._
- **Why does `react` connect `accountName` to `App`, `App.tsx`, `package.json`, `Nuevo.tsx`, `import.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08408163265306122 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `accountName` to `App`, `App.tsx`, `package.json`, `Nuevo.tsx`, `import.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._