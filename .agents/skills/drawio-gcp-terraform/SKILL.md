---
name: drawio-gcp-terraform
description: Generate and update Draw.io architecture diagrams from Terraform-managed GCP infrastructure using Draw.io MCP. Use when asked to diagram `.tf` code, refresh cloud architecture docs, or produce production/stage GCP infra diagrams with strict Terraform fidelity (no invented resources).
---

# Draw.io GCP Terraform

## Overview

Convert Terraform infrastructure into clean, accurate Draw.io diagrams via Draw.io MCP.
Read the Terraform first, extract resources and relationships deterministically, then draw with official GCP icons and explicit edge labels.

## Workflow

1. Confirm Draw.io MCP connectivity.
2. Extract Terraform resources and dependencies.
3. Build a diagram plan (main flow, auxiliary services, environment boundaries).
4. Create nodes with official GCP icons.
5. Create labeled edges with consistent styles.
6. Validate coverage: every diagrammed resource exists in Terraform and all critical dependencies are represented.

## Step 1: Confirm MCP Connectivity

Run lightweight inspection calls first.

- Use `get-shape-categories`.
- Use `get-shapes-in-category` for GCP/Google categories.
- Use `list-paged-model` to inspect current canvas.

If the shape library is unavailable, stop and fix setup before drawing.

## Step 2: Extract Terraform Resource Graph

Use the extracted graph as the source of truth.

For this repository, also load:

- `references/transportoptimizer-infra-map.md`
- `references/gcp-shape-and-style-rules.md`

## Step 3: Plan Layout Before Drawing

Apply these layout rules:

1. Place end users outside the GCP cloud boundary.
2. Place the primary request/data flow on one horizontal row.
3. Place supporting/security/observability components above or below the main row.
4. Put annotations to the right of icons, not below.
5. Separate shared foundation resources from per-environment resources.

## Step 4: Create Nodes

For each extracted resource:

1. Map resource type to a GCP icon using available shape categories.
2. Use short text labels (service or resource role only).
3. Apply category color/style from `references/gcp-shape-and-style-rules.md`.
4. Add optional right-side annotations for details (CIDR, mode, auth, region).

## Step 5: Create Edges

Use three edge classes:

- Traffic/data flow: solid green.
- Identity/configuration linkage: dashed gray.
- Control-plane/management linkage: solid blue.

Label every edge with intent (for example `HTTP`, `PSC`, `Workload Identity`, `IAM Binding`, `Backend Bucket`).

## Step 6: Validate Output

Before finishing:

1. Re-read canvas with `list-paged-model`.
2. Compare against extracted resources/edges.
3. Remove any node/edge that cannot be traced to Terraform.
4. Confirm text labels contain no HTML tags.

## Hard Rules

### Never invent resources

Diagram only resources that exist in Terraform.
Do not add "best-practice" components that are not declared.

### Keep users external

Users, admins, and external clients are outside the GCP cloud boundary.

### Never use HTML in labels

Do not include `<br>`, `&nbsp;`, `<font>`, or any HTML tags/entities in text fields.

### Keep diagram readable

Avoid crossing edges when possible.
Prioritize left-to-right flow and stable spacing.

### Preserve environment intent

When Terraform uses `for_each` for environments (stage/prod), either:

- show separate environment lanes, or
- show a single node with an explicit annotation (`per-env: stage/prod`).

Do not collapse shared and per-env resources without annotation.

## Output Contract

Produce:

1. A Draw.io diagram with GCP icons and labeled edges.
2. A short textual inventory of what was diagrammed.
3. A short gap list (if any Terraform resources were intentionally omitted because they are non-architectural).
