---
id: 005-sfcc-tools-integration
title: "SFCC integration: tool registry + clients mock/real + tools"
milestone: m2-infrastructure
priority: high
estimation: M
blockedBy: ["002-domain-models-and-libs"]
blocks: ["007-pipeline-orchestrator"]
status: done
closed_by_commit: 5628ea9
---

## Summary

Tool registry genérico (Map<name, ToolSpec>) + interface ISFCCClient con 2 implementaciones intercambiables vía env var SFCC_MODE (mock|real). Mock lee de fixtures JSON (12 pedidos + 15 productos), real hace OAuth client_credentials + HTTP via undici contra OCAPI Shop API. 2 tools registrados: get_order_status (existente desde inicio) y search_products (agregado en commit `7195944` con stemming + scoring).

## Scope (deliverables)

- `hermes/src/tools/tool-registry.ts` — registro genérico + ToolSpec interface + toBedrockTools helper
- `hermes/src/tools/sfcc/sfcc-client.ts` — ISFCCClient interface + factory createSfccClient(mode, config)
- `hermes/src/tools/sfcc/real-sfcc-client.ts` — OAuth + undici con token cache + mapSfccOrder + mapSfccStatus
- `hermes/src/tools/sfcc/mock-sfcc-client.ts` — lee fixtures + keyword matching para searchProducts (stemming + scoring)
- `hermes/src/tools/sfcc/get-order-status.tool.ts` — wrapper con Zod validation
- `hermes/src/tools/sfcc/search-products.tool.ts` — wrapper con Zod validation
- `hermes/fixtures/demo-orders.json` — 12 pedidos curados Patprimo (7 status del enum)
- `hermes/fixtures/demo-products.json` — 15 productos catálogo

## Acceptance criteria

- [x] SFCC_MODE=mock devuelve datos de fixtures sin tocar red
- [x] SFCC_MODE=real devuelve stub para searchProducts (queda Fase 2) + getOrderStatus funcional vs OCAPI
- [x] Order ID inexistente devuelve `{not_found: true}` (anti-enumeration R-ID-2)
- [x] search_products con stemming matchea plurales ("jeans" → "jean")
- [x] tool_registry.get('search_products') retorna tool registrado

## Test plan

- Manual: curl POST /chat con order_id válido + inválido + producto search
- Smoke suite: casos 1-10 cubren get_order_status; casos manuales product search
- Integration: chat.test.ts confirma wiring

## Context

- Plan AI-DLC: Step 8 del plan U1
- Plan B Demo Day SFCC_MODE: memory `project_demo_day_plan_b`
- Product recommendations: branch mergeada `feature/product-recommendations` (commit 7195944)
- Anti-enumeration R-ID-2: `business-rules.md`

## Definition of ready

- [x] Models GetOrderStatusInput/Result + SearchProductsInput/Result definidos (task 002)
- [x] Fixtures con datos curados (no inventados)
- [x] Decisión Plan B confirmada
