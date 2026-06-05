---
id: 010-frontend-widget
title: "Widget vanilla TS bundle (esbuild IIFE, ~7KB minified)"
milestone: m4-api-and-widget
priority: high
estimation: L
blockedBy: ["009-composition-root-entrypoints"]
blocks: ["011-tests-suite"]
status: done
closed_by_commit: 5628ea9
---

## Summary

Frontend del agente: bundle vanilla TypeScript que se embebe en SFCC vía 1 `<script src>`. Sin frameworks (no React/Vue) para minimizar tamaño + evitar conflicts con scripts del storefront. Expone window.HermesWidget.init(options) que recibe primaryColor (brand) + apiBaseUrl + brand id, monta un FAB flotante + ventana de chat oculta inicialmente, hace fetch /widget/config para textos, gestiona consent + multi-turn + error states con state manager simple.

## Scope (deliverables)

Core (`hermes/widget/src/core/`):
- `widget-state.ts` — state manager con subscribe + setState + initial state (isOpen, messages, hasConsented, etc.)
- `event-bus.ts` — pub/sub para send/consent/handoff events
- `api-client.ts` — fetch wrapper para /chat + /widget/config

Components (`hermes/widget/src/components/`):
- `widget-root.ts` — wrapper que contiene FAB + container chat (fix bug #11)
- `widget-header.ts` — title (lee customerFacingName dinámico del config) + indicator IA + close btn
- `message-list.ts` + `message-bubble.ts` — render mensajes user/assistant
- `input-area.ts` — textarea + send button
- `consent-prompt.ts` — overlay con texto consent + accept/deny buttons
- `handoff-button.ts` — botón "Hablar con una persona" → emit handoff event (mensaje placeholder)
- `error-banner.ts` — error display

Resto (`hermes/widget/`):
- `src/i18n/es-CO.ts` — strings Patprimo
- `src/styles/widget.css` — mobile-first BEM + color brand `#1c1f2a`
- `esbuild.config.mjs` — IIFE bundle con globalName HermesWidget
- `package.json` con esbuild + typescript devDeps
- `public/test.html` + `public/test-init.js` — pages de prueba local

## Acceptance criteria

- [x] `npm run build:widget` produce widget.js (~7KB min) + widget.css en public/
- [x] HermesWidget.init({apiBaseUrl, brand, primaryColor, onPrimaryColor}) monta el widget
- [x] FAB aparece en bottom-right con color brand
- [x] Click FAB abre ventana de chat con consent prompt
- [x] Header lee customerFacingName del config → "Sofía de Patprimo"
- [x] Multi-turn: state.messages persiste mientras la ventana esté abierta
- [x] CORP cross-origin permite carga desde SFCC sandbox (fix bug #12)

## Test plan

- Manual: abrir http://localhost:3000/widget/test.html → verificar FAB + click → chat
- Manual: probar en SFCC sandbox via Cloudflare Tunnel
- Verificar Network tab: widget.js + widget.css + test-init.js + /widget/config todos 200

## Context

- Plan AI-DLC: Step 16 del plan U1
- frontend-components.md FE-1: `functional-design/frontend-components.md`
- Widget audit findings: memory `project_widget_audit_findings`
- Bugs corregidos:
  - #11 FAB nunca agregado al DOM
  - #12 CORP same-origin bloqueaba cross-origin load

## Definition of ready

- [x] Backend API funcional (task 009)
- [x] Endpoint /widget/config sirve config persona (task 008)
- [x] Design decision: vanilla TS, no framework
