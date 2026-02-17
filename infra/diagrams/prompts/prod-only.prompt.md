Analyze this repository's Terraform and generate a professional Draw.io diagram for the **production GCP infrastructure only**.

Constraints:

1. Use the skill `drawio-gcp-terraform`.
2. Do not invent resources.
3. Use only resources present in Terraform.
4. Use official GCP icons from Draw.io shape libraries.
5. Keep Users outside the GCP cloud boundary.
6. Use plain text labels only (no HTML tags/entities).
7. Keep main request/data flow on one horizontal row.
8. Place annotations to the right of icons.

Repository focus:

- Shared foundation: `infra/common`
- Production deployment root: `infra/env` with `environments/prod.tfvars`

Expected output:

- One clean production architecture diagram
- Labeled connections (traffic, IAM/workload identity, Redis/PSC, LB path)
- Short legend by category
- Short “omitted details” list (if any non-architectural Terraform resources are omitted)
