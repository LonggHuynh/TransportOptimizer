# Terraform Workspaces

This stack is split across three Terraform Cloud workspaces:

1. `transport-common`
2. `transport-dev`
3. `transport-stage`

`infra/backend.tf` uses `workspaces { prefix = "transport-" }`, so local CLI workspace names map as:

- `common` -> `transport-common`
- `dev` -> `transport-dev`
- `stage` -> `transport-stage`

## Behavior by Workspace

- `transport-common`: manages shared GCP infrastructure (APIs, VPC/subnets, NAT, GKE, Redis, IAM, frontend bucket/LB).
- `transport-dev`: manages only Helm app release for `dev`.
- `transport-stage`: manages only Helm app release for `stage`.
- Stage/dev workspaces link to shared outputs via `data.terraform_remote_state.common`.

## Apply Order

1. Apply `transport-common` first.
2. Apply `transport-dev`.
3. Apply `transport-stage`.

## Migration From Old `transport` Workspace

If your existing state is in a single workspace named `transport`, migrate state before first apply with this layout.

1. Rename Terraform Cloud workspace `transport` -> `transport-common` (keeps existing state/history).
2. In local CLI, switch to `common` workspace.
3. Remove legacy Helm release resources from `transport-common` state only (no cluster delete):

```bash
cd infra
terraform init
terraform workspace select common
terraform state rm 'helm_release.app["stage"]'
terraform state rm 'helm_release.app["prod"]'
```

4. Create/select `stage` workspace and import stage Helm release:

```bash
terraform workspace select stage || terraform workspace new stage
terraform import 'helm_release.app["stage"]' transport-stage/transport-optimizer
```

5. Create/select `dev` workspace. If no existing dev release exists yet, `terraform apply` will create it:

```bash
terraform workspace select dev || terraform workspace new dev
terraform plan
terraform apply
```

6. Run `terraform plan` in each workspace (`common`, `dev`, `stage`) and confirm no unexpected create/destroy.

## CLI Examples

```bash
cd infra
terraform init

terraform workspace select common || terraform workspace new common
terraform plan
terraform apply

terraform workspace select dev || terraform workspace new dev
terraform plan
terraform apply

terraform workspace select stage || terraform workspace new stage
terraform plan
terraform apply
```
