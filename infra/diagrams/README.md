# Draw.io MCP Workflow for Terraform GCP Diagrams

This project includes a reusable skill and extraction tooling to generate Draw.io architecture diagrams from Terraform.

## Included Artifacts

- Skill: `.agents/drawio-gcp-terraform/SKILL.md`
- Extractor script: `.agents/drawio-gcp-terraform/scripts/extract_terraform_graph.py`
- Style/reference guides: `.agents/drawio-gcp-terraform/references/`
- Ready prompts: `infra/diagrams/prompts/`

## 1. Install Draw.io MCP Server

Use the official server and extension:

```bash
npm install -g drawio-mcp-server
npm install -g drawio-mcp-server-extension
setup-drawio-extension
```

References:

- https://github.com/lgazo/drawio-mcp-server
- https://github.com/lgazo/drawio-mcp-server-extension

## 2. Configure Your Agent

### Codex (`.codex/config.toml`)

```toml
[mcp_servers.drawio]
command = "npx"
args = ["-y", "drawio-mcp-server@latest"]
```

### Claude Code (`.mcp.json`)

```json
{
  "mcpServers": {
    "drawio": {
      "command": "npx",
      "args": ["-y", "drawio-mcp-server@latest"]
    }
  }
}
```

## 3. Extract Terraform Graph (Source of Truth)

Run before drawing:

```bash
python .agents/drawio-gcp-terraform/scripts/extract_terraform_graph.py --root infra --format json --include-modules --output infra/diagrams/specs/terraform-graph.json
python .agents/drawio-gcp-terraform/scripts/extract_terraform_graph.py --root infra --format markdown --include-modules --output infra/diagrams/specs/terraform-graph.md
```

## 4. Generate Diagram in Draw.io

1. Open https://app.diagrams.net/ in Chrome with the Draw.io MCP extension enabled.
2. Open a blank diagram.
3. Ask your MCP-compatible coding agent to run the skill `drawio-gcp-terraform`.
4. Use one of the prompts in `infra/diagrams/prompts/`.

## 5. Recommended Prompt Files

- `infra/diagrams/prompts/prod-only.prompt.md`: production-focused architecture.
- `infra/diagrams/prompts/shared-foundation.prompt.md`: shared foundation architecture.

## Notes

- The workflow enforces strict no-invention rules.
- Users are outside the cloud boundary.
- Labels must be plain text only (no HTML).
