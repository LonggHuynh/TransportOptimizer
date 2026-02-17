Generate a Draw.io diagram for the **shared Terraform foundation** in `infra/common`.

Constraints:

1. Use the skill `drawio-gcp-terraform`.
2. Do not invent resources.
3. Diagram only resources declared in Terraform.
4. Use official GCP icons.
5. Keep layout clean with minimal crossing edges.
6. Use plain text labels only.

Include these groups:

- VPC + subnets (stage/prod + shared GKE + PSC)
- Cloud Router + NATs
- Shared GKE Autopilot cluster
- Redis cluster + PSC service connection policy
- Frontend hosting path (GCS bucket -> backend bucket -> URL map -> HTTP proxy -> global forwarding rule)
- Service accounts and IAM relationships
- Required APIs (as a compact platform block)

Expected output:

- One shared foundation diagram
- Category legend
- Edge labels for key links (`PSC`, `NAT`, `HTTP :80`, `Workload Identity`, `IAM Binding`)
