# WebPerf Snippets — Plan de Mejoras Consolidado

> Fusión de análisis realizados el 2026-03-30 por Claude, Codex y Gemini CLI.
> Los ítems marcados con ★ son consenso entre al menos dos de los tres análisis.

---

## Resumen ejecutivo

El proyecto tiene una base sólida: 47 snippets bien organizados, documentación visual con diagramas Mermaid, soporte de Agent Skills y paridad entre fuentes, páginas y artefactos generados. Las mejoras se agrupan en cinco vectores:

1. **Robustez** — Evitar inconsistencias entre fuentes y artefactos generados
2. **Consistencia editorial** — Homogeneizar la profundidad de cada página
3. **Descubribilidad** — Mejorar el onboarding y la navegación por contexto
4. **Expansión** — Nuevos snippets para APIs modernas
5. **Medios y visuales** — Hacer el output comprensible a primera vista

---

## Fase 1 — Robustez y mantenibilidad ★

**Objetivo:** Reducir el riesgo de inconsistencias entre contenido fuente y artefactos generados.

### 1.1 Script de consistencia ★

Crear `scripts/check-consistency.js` expuesto como:

```json
"check:consistency": "node scripts/check-consistency.js"
```

Debe validar:
- Cada snippet tiene página MDX asociada (o excepción explícita)
- Cada página tiene snippet asociado (o está marcada como página editorial)
- `_meta.json` está alineado con los `.mdx` existentes
- `skills/` y `dist/` no están desactualizados respecto a `snippets/` y `pages/`
- Los conteos publicados en `README.md` y `SKILLS.md` no han quedado obsoletos

### 1.2 Check de artefactos generados ★

```json
"generate-skills:check": "node scripts/generate-skills.js && git diff --exit-code -- skills dist"
```

Detecta si alguien modifica fuentes sin regenerar salidas. Corrige también la desalineación actual entre `package.json` (v1.2.0) y `skills/webperf/SKILL.md` (v1.1.0).

### 1.3 Modelo explícito para páginas editoriales

`Get-Your-Head-in-Order.mdx` es contenido editorial válido, pero no está formalizado. Opciones:

- Frontmatter `type: guide` para páginas sin snippet asociado
- Lista de excepciones explícitas en el check de consistencia

Recomendación: usar frontmatter — es autodocumentado y legible por automatizaciones.

### 1.4 CI para pull requests ★

Workflow de GitHub Actions en cada PR:

```yaml
- npm ci
- npm run lint
- npm run build
- npm run check:consistency
- npm run generate-skills:check
```

Es la mejora con mejor retorno inmediato: evita que errores de consistencia lleguen a `main`.

---

## Fase 2 — Documentación y experiencia de contribución ★

**Objetivo:** Reducir la curva de entrada para nuevos contribuidores y consumidores.

### 2.1 Plantilla estándar por página ★

Esqueleto mínimo para cada snippet:

```
1. Descripción breve (2-3 párrafos)
2. Tabla de umbrales (Good / Needs Improvement / Poor) — donde aplique
3. Diagrama Mermaid (flujo o secuencia)
4. Snippet ejecutable con botón de copia
5. Explicación del output (qué significa cada campo)
6. Causas comunes y qué hacer si el resultado es malo
7. Ejemplo de integración RUM (al menos 1)
8. Tabla de compatibilidad de navegadores
9. Further Reading
```

Páginas prioritarias a enriquecer:

| Página | Qué le falta |
|--------|-------------|
| `LCP-Trail.mdx` | Tabla de campos, diagrama, sección de interpretación |
| `LCP.mdx` | Ejemplo de integración RUM |
| `FCP.mdx` | Diagrama de fases, tabla de causas comunes |
| `LongTask.mdx` | Migración FID→INP, comparativa con LoAF |
| `Scroll-Performance.mdx` | Tabla de umbrales, ejemplos de causas |
| `Content-Visibility.mdx` | Diagrama before/after, casos de uso |
| `Back-Forward-Cache.mdx` | Tabla de razones de fallo más comunes |

### 2.2 Tabla de compatibilidad de APIs ★

En cada página, tabla de soporte real:

| API | Chrome | Firefox | Safari | Edge |
|-----|--------|---------|--------|------|
| PerformanceObserver | ✅ 52 | ✅ 57 | ✅ 11 | ✅ 79 |
| Long Animation Frames | ✅ 123 | ❌ | ❌ | ✅ 123 |

Actualmente solo `INP.mdx` tiene esta tabla. Evita frustración cuando un snippet no devuelve datos.

### 2.3 Documento de arquitectura

Crear `docs/ARCHITECTURE.md` con:

- Flujo: fuente → docs → skills → dist
- Qué archivos son fuente de verdad vs. generados
- Cuándo ejecutar `generate-skills`
- Cómo se relacionan `pages/`, `snippets/`, `skills/` y `dist/`

### 2.4 Guía de release

Crear `docs/RELEASING.md`:

- Cómo subir versión
- Cómo regenerar skills
- Cómo validar que `SKILL.md` usa la versión correcta
- Qué assets genera el workflow de release

### 2.5 Plantilla para nuevos snippets ★

Archivos `templates/snippet.js` y `templates/snippet-page.mdx` con la estructura mínima esperada. Futuro comando:

```json
"new:snippet": "node scripts/new-snippet.js"
```

Evita errores de naming, estructura y quality bar en cada aportación nueva.

### 2.6 Páginas índice por categoría

Añadir páginas de entrada por categoría:

- `CoreWebVitals/index.mdx` — Diagrama relacional LCP / INP / CLS. Cuándo afecta cada uno al score de PageSpeed
- `Loading/index.mdx` — Jerarquía TTFB → FCP → LCP. Flujo de decisión: "¿qué medir primero?"
- `Interaction/index.mdx` — INP como métrica principal, LoAF como herramienta de diagnóstico
- `Media/index.mdx` — Impacto de imágenes y vídeos en LCP y CLS

### 2.7 Guía de inicio rápido por perfil

En `index.mdx` o como página separada:

```
¿Eres...?
├── Developer   → LCP Sub-Parts + Resource Hints
├── Analista    → Core Web Vitals + TTFB
├── DevOps      → TTFB + Service Worker Analysis
└── Diseñador   → CLS + Image Element Audit
```

### 2.8 Glosario técnico

Crear `pages/glossary.mdx`:
BPP, LoAF, hadRecentInput, TAO, TTFB sub-parts, Core Web Vitals vs. Lighthouse metrics, RUM vs. Lab data.

---

## Fase 3 — Medios y documentación visual ★

**Objetivo:** Hacer el output comprensible a primera vista, especialmente para usuarios que llegan desde buscadores o IA.

### 3.1 Capturas de output en DevTools ★

Para los snippets principales (`LCP`, `CLS`, `INP`, `TTFB`, `FCP`, `Long-Animation-Frames`, `Image-Element-Audit`):

- Captura del output en consola (imagen o GIF animado)
- Breve interpretación del resultado
- Ejemplo de output "bueno" vs. "problemático"

Formato recomendado: imágenes en Cloudinary integradas con `CldImage`. La infraestructura ya existe.

### 3.2 Sección RUM integration en páginas clave ★

Replicar el patrón de `INP.mdx` (GA4, DataDog, New Relic) en:
`LCP.mdx`, `CLS.mdx`, `TTFB.mdx`, `Long-Animation-Frames.mdx`

### 3.3 Videos cortos por workflow ★

Priorizar vídeos de 30–90 segundos orientados a intención concreta:

- "Cómo depurar TTFB lento"
- "Cómo detectar render-blocking resources"
- "Cómo investigar un LCP basado en imagen"
- "Cómo usar WebPerf Skills con un agente"
- "Cómo leer el output de INP"

Un problema, una demo, una conclusión. La infraestructura Cloudinary ya está disponible.

### 3.4 Playbooks / casos de uso reales

Crear `pages/playbooks/`:

- Auditar una landing lenta
- Depurar terceros que bloquean render
- Investigar mala experiencia móvil en red 3G
- Analizar una página Next.js con exceso de hydration data

Conecta el catálogo técnico con problemas reales y mejora la descubribilidad desde buscadores.

### 3.5 Botón de "Demo Live"

Implementar páginas de prueba diseñadas para fallar en una métrica concreta (imagen pesada sin optimizar para LCP, shifts de layout para CLS) vinculadas desde su snippet. Los usuarios pueden abrir la página y ejecutar el snippet al instante.

---

## Fase 4 — Tooling interno

**Objetivo:** Reducir trabajo manual y convertir el repo en un sistema más autosuficiente.

### 4.1 `scripts/new-snippet.js`

Genera automáticamente:
- Archivo en `snippets/<Category>/`
- Página en `pages/<Category>/`
- Entrada en `_meta.json`

### 4.2 Registro de snippets como fuente de verdad ★

Centralizar metadatos en `snippets-registry.json` o expandir `lib/snippets-registry.js` para que sea generado:
- Imports, títulos, descripciones base, URLs
- Genera `_meta.json` y tabla de contenidos en `README.md`
- Proporciona API interna para Agent Skills

### 4.3 `scripts/docs-stats.js`

Genera estadísticas del proyecto:
- Snippets por categoría
- Páginas editoriales vs. páginas con snippet
- Últimas incorporaciones
- Cobertura de tablas de compatibilidad y capturas

Útil para refrescar README o una página "Project Stats".

### 4.4 Smoke tests para scripts críticos

Tests básicos de filesystem y outputs esperados para:
`generate-skills.js`, `install-skills.js`, `install-global.js`, `install-from-release.js`, futuro `check-consistency.js`

### 4.5 Badges de salud en README

- Última release
- Estado del CI
- Número de snippets
- Licencia

---

## Fase 5 — Nuevos snippets

**Objetivo:** Cubrir APIs modernas donde el proyecto puede ganar diferenciación.

### 5.1 Core Web Vitals

| Snippet | API clave | Chrome mín. |
|---------|-----------|-------------|
| `INP-Attribution.js` | PerformanceObserver + LoAF | 123 |
| `CLS-Source-Attribution.js` | LayoutShift attribution | 84 |
| `LCP-Initiator-Chain.js` | Resource Timing + LoAF | 123 |

### 5.2 Loading ★

| Snippet | API clave | Chrome mín. |
|---------|-----------|-------------|
| `Speculation-Rules-Audit.js` ★ | document.ruleSets | 109 |
| `Fetch-Priority-Audit.js` | Resource Timing priority | 102 |
| `Early-Hints-Detection.js` ★ | Resource Timing | 103 |
| `Third-Party-Impact-Score.js` ★ | LoAF + Resource Timing | 123 |
| `HTTP-Cache-Audit.js` ★ | Resource Timing cache | 52 |
| `Compression-Audit.js` | Resource Timing encoding | 52 |
| `Module-Preload-Audit.js` | Resource Timing + ES modules | 66 |

### 5.3 Interaction

| Snippet | API clave | Chrome mín. |
|---------|-----------|-------------|
| `INP-Long-Tasks-Correlation.js` | LoAF + INP | 123 |
| `Pointer-Event-Latency.js` | Event Timing | 76 |
| `Soft-Navigation-Tracking.js` ★ | Soft Navigations API (exp.) | 123 |

### 5.4 Media

| Snippet | API clave | Chrome mín. |
|---------|-----------|-------------|
| `Image-Format-Audit.js` | Resource Timing + DOM | 52 |
| `Responsive-Images-Audit.js` | DOM inspection | 52 |
| `Font-Display-Audit.js` ★ | CSS OM + Resource Timing | 52 |
| `Font-Face-Detailed-Timing.js` ★ | FontFaceSet API | 35 |
| `Image-CDN-Policy-Audit.js` | Resource Timing + DOM | 52 |

### 5.5 Nueva categoría: Security & Privacy Performance

| Snippet | API clave | Chrome mín. |
|---------|-----------|-------------|
| `Permissions-Policy-Audit.js` | document.featurePolicy | 74 |
| `Cross-Origin-Isolation-Audit.js` | crossOriginIsolated | 87 |

### 5.6 Nueva categoría: Resilience & Offline

| Snippet | API clave | Chrome mín. |
|---------|-----------|-------------|
| `Service-Worker-Cache-Strategy.js` | SW Cache API | 40 |
| `Offline-Fallback-Audit.js` | SW + Fetch | 40 |

---

## Fase 6 — Mejoras en snippets existentes

| Script | Mejora |
|--------|--------|
| `TTFB.js` | Añadir parsing de `Server-Timing` header |
| `First-And-Third-Party-Script-Info.js` | Correlacionar con LoAF para indicar impacto en LCP/INP |
| `Resource-Hints.js` | Verificar si preloads y prefetches se usaron realmente |
| `Fonts-Preloaded-Loaded-and-used-above-the-fold.js` | Detectar font subsetting con `unicode-range` |
| `Long-Animation-Frames.js` | Mini timeline ASCII en consola para identificar patrones |

---

## Fase 7 — Internacionalización

Dado que el autor y parte de la comunidad de WebPerf es hispanohablante, traducir la documentación al español aportaría valor diferencial. Configurar Nextra para `/en/` y `/es/` y traducir guías y explicaciones de métricas en fases.

---

## Priorización

### Alta prioridad — impacto inmediato

1. ★ Corregir desalineación de versión `package.json` vs `SKILL.md`
2. ★ `check-consistency.js` + `generate-skills:check`
3. ★ CI para pull requests (lint + build + consistency + artifacts)
4. ★ Capturas de output en consola para los 7 snippets principales
5. ★ Enriquecer páginas con poco contenido (LCP-Trail, FCP, LongTask, Scroll-Performance)
6. ★ `Speculation-Rules-Audit.js` — API moderna, alta demanda en 2025-2026
7. ★ `Third-Party-Impact-Score.js` — pregunta más frecuente en auditorías

### Media prioridad — mejora la calidad global

8. Páginas índice por categoría
9. ★ RUM integration en LCP, CLS, TTFB
10. ★ `HTTP-Cache-Audit.js` y `Fetch-Priority-Audit.js`
11. ★ Plantilla para nuevos snippets + `new-snippet.js`
12. `docs/ARCHITECTURE.md` y `docs/RELEASING.md`
13. ★ Tabla de compatibilidad de APIs en cada página
14. Glosario técnico
15. Guía de inicio rápido por perfil

### Baja prioridad — madurez del proyecto

16. Testing de snippets (smoke tests + Playwright)
17. Nueva categoría Security & Privacy Performance
18. Nueva categoría Resilience & Offline
19. Videos cortos por workflow
20. Playbooks de casos de uso reales
21. Botón de "Demo Live"
22. Internacionalización (español)
23. Snippet output schema (TypeScript types)

---

## Quick wins muy concretos

Acciones de menos de 1 hora cada una:

- [ ] Corregir versión en `skills/webperf/SKILL.md` (1.1.0 → 1.2.0)
- [ ] Añadir frontmatter `type: guide` a `Get-Your-Head-in-Order.mdx`
- [ ] Añadir `npm run check:consistency` al script section de `package.json`
- [ ] Añadir sección "Start here" en `README.md`
- [ ] Añadir badges (release, CI status, snippet count) en `README.md`
- [ ] Añadir tabla de compatibilidad a `LCP.mdx`, `CLS.mdx`, `TTFB.mdx`
- [ ] Añadir al menos 3 capturas de consola en snippets clave

---

*Fusión consolidada — 2026-04-05*
