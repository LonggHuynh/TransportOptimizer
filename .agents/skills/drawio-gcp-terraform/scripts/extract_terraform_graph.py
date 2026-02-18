#!/usr/bin/env python3
"""Extract Terraform resources and dependency edges for diagram generation.

The script intentionally uses lightweight parsing (regex + brace balancing) so it can run
without external dependencies.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

RESOURCE_START_RE = re.compile(r'^\s*resource\s+"([^"]+)"\s+"([^"]+)"\s*\{')
DATA_START_RE = re.compile(r'^\s*data\s+"([^"]+)"\s+"([^"]+)"\s*\{')
MODULE_START_RE = re.compile(r'^\s*module\s+"([^"]+)"\s*\{')

# Capture address-like expressions (google_xxx.yyy, helm_release.app, module.app, data.foo.bar)
ADDRESS_RE = re.compile(r'\b([a-z][a-z0-9_]*)\.([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?')

INDEX_SUFFIX_RE = re.compile(r'\[[^\]]+\]')

CATEGORY_BY_PREFIX = {
    "google_compute_": "networking",
    "google_network_connectivity_": "networking",
    "google_container_": "compute",
    "google_storage_": "storage",
    "google_redis_": "database-cache",
    "google_service_account": "security-identity",
    "google_project_iam_": "security-identity",
    "google_service_account_iam_": "security-identity",
    "google_project_service": "platform",
    "helm_release": "kubernetes-app",
}

SERVICE_NAME_BY_TYPE = {
    "google_compute_network": "VPC Network",
    "google_compute_subnetwork": "Subnetwork",
    "google_compute_router": "Cloud Router",
    "google_compute_router_nat": "Cloud NAT",
    "google_container_cluster": "GKE Cluster",
    "google_redis_cluster": "Memorystore Redis Cluster",
    "google_storage_bucket": "Cloud Storage Bucket",
    "google_storage_bucket_iam_member": "Cloud Storage IAM",
    "google_compute_backend_bucket": "Backend Bucket",
    "google_compute_url_map": "URL Map",
    "google_compute_target_http_proxy": "HTTP Proxy",
    "google_compute_global_address": "Global Address",
    "google_compute_global_forwarding_rule": "Global Forwarding Rule",
    "google_network_connectivity_service_connection_policy": "PSC Service Connection Policy",
    "google_project_service": "Project API",
    "google_service_account": "Service Account",
    "google_project_iam_member": "Project IAM Binding",
    "google_service_account_iam_member": "Service Account IAM Binding",
    "helm_release": "Helm Release",
}

IGNORED_PREFIXES = {
    "var",
    "local",
    "path",
    "terraform",
    "each",
    "count",
    "self",
}


@dataclass
class Node:
    kind: str
    address: str
    type: str
    name: str
    category: str
    service: str
    scope: str
    file: str
    line: int


@dataclass
class Edge:
    from_address: str
    to_address: str
    relation: str


@dataclass
class Block:
    kind: str
    address: str
    type: str
    name: str
    file: Path
    rel_file: str
    line: int
    body: str


def list_tf_files(root: Path) -> list[Path]:
    files: list[Path] = []
    for tf in root.rglob("*.tf"):
        if "/.terraform/" in f"/{tf.as_posix()}/":
            continue
        files.append(tf)
    return sorted(files)


def block_scope(body: str) -> str:
    if "for_each = local.foundation_environments" in body:
        return "per-environment"
    if "for_each = local.environments" in body:
        return "per-environment"
    if "count = local.manage_foundation ? 1 : 0" in body:
        return "shared-foundation"
    if "var.environment" in body:
        return "single-environment"
    return "unspecified"


def classify_category(resource_type: str, kind: str) -> str:
    if kind == "module":
        return "module"
    if kind == "data":
        return "data-source"
    for prefix, category in CATEGORY_BY_PREFIX.items():
        if resource_type.startswith(prefix):
            return category
    return "other"


def service_name(resource_type: str, kind: str, name: str) -> str:
    if kind == "module":
        return f"Terraform Module ({name})"
    if kind == "data":
        return f"Data Source ({resource_type})"
    return SERVICE_NAME_BY_TYPE.get(resource_type, resource_type)


def parse_blocks(tf_file: Path, root: Path, include_data: bool, include_modules: bool) -> list[Block]:
    lines = tf_file.read_text(encoding="utf-8").splitlines()
    blocks: list[Block] = []
    i = 0

    while i < len(lines):
        line = lines[i]
        start_kind: str | None = None
        resource_type = ""
        name = ""

        m_resource = RESOURCE_START_RE.match(line)
        m_data = DATA_START_RE.match(line) if include_data else None
        m_module = MODULE_START_RE.match(line) if include_modules else None

        if m_resource:
            start_kind = "resource"
            resource_type = m_resource.group(1)
            name = m_resource.group(2)
            address = f"{resource_type}.{name}"
        elif m_data:
            start_kind = "data"
            resource_type = m_data.group(1)
            name = m_data.group(2)
            address = f"data.{resource_type}.{name}"
        elif m_module:
            start_kind = "module"
            resource_type = "module"
            name = m_module.group(1)
            address = f"module.{name}"
        else:
            i += 1
            continue

        start_line = i + 1
        brace_depth = line.count("{") - line.count("}")
        chunk = [line]
        i += 1

        while i < len(lines) and brace_depth > 0:
            current = lines[i]
            chunk.append(current)
            brace_depth += current.count("{") - current.count("}")
            i += 1

        body = "\n".join(chunk)
        blocks.append(
            Block(
                kind=start_kind,
                address=address,
                type=resource_type,
                name=name,
                file=tf_file,
                rel_file=tf_file.relative_to(root).as_posix(),
                line=start_line,
                body=body,
            )
        )

    return blocks


def normalize_address_token(token: str) -> str:
    token = token.strip()
    token = INDEX_SUFFIX_RE.sub("", token)
    for suffix in (
        ".id",
        ".name",
        ".self_link",
        ".address",
        ".endpoint",
        ".email",
        ".port",
    ):
        if token.endswith(suffix):
            token = token[: -len(suffix)]
            break
    return token


def extract_candidate_addresses(body: str) -> set[str]:
    candidates: set[str] = set()

    for match in ADDRESS_RE.finditer(body):
        first = match.group(1)
        second = match.group(2)
        third = match.group(3)

        if first in IGNORED_PREFIXES:
            continue

        if first == "data" and third:
            candidates.add(normalize_address_token(f"data.{second}.{third}"))
            continue

        if first == "module":
            candidates.add(normalize_address_token(f"module.{second}"))
            continue

        candidates.add(normalize_address_token(f"{first}.{second}"))

    return candidates


def build_nodes(blocks: Iterable[Block]) -> list[Node]:
    nodes: list[Node] = []
    for block in blocks:
        nodes.append(
            Node(
                kind=block.kind,
                address=block.address,
                type=block.type,
                name=block.name,
                category=classify_category(block.type, block.kind),
                service=service_name(block.type, block.kind, block.name),
                scope=block_scope(block.body),
                file=block.rel_file,
                line=block.line,
            )
        )
    return sorted(nodes, key=lambda n: (n.file, n.line, n.address))


def build_edges(blocks: Iterable[Block], known_addresses: set[str]) -> list[Edge]:
    edges_set: set[tuple[str, str, str]] = set()

    for block in blocks:
        candidates = extract_candidate_addresses(block.body)

        for candidate in candidates:
            if candidate == block.address:
                continue
            if candidate not in known_addresses:
                continue
            edges_set.add((candidate, block.address, "references"))

    edges = [Edge(from_address=f, to_address=t, relation=r) for f, t, r in sorted(edges_set)]
    return edges


def to_markdown(root: Path, nodes: list[Node], edges: list[Edge]) -> str:
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    categories: dict[str, int] = {}
    for node in nodes:
        categories[node.category] = categories.get(node.category, 0) + 1

    lines: list[str] = []
    lines.append("# Terraform Diagram Inventory")
    lines.append("")
    lines.append(f"- Generated: `{now}`")
    lines.append(f"- Root: `{root.as_posix()}`")
    lines.append(f"- Nodes: `{len(nodes)}`")
    lines.append(f"- Edges: `{len(edges)}`")
    lines.append("")

    lines.append("## Category Counts")
    lines.append("")
    lines.append("| Category | Count |")
    lines.append("| --- | ---: |")
    for category in sorted(categories):
        lines.append(f"| {category} | {categories[category]} |")
    lines.append("")

    lines.append("## Nodes")
    lines.append("")
    lines.append("| Address | Kind | Service | Category | Scope | File |")
    lines.append("| --- | --- | --- | --- | --- | --- |")
    for node in nodes:
        lines.append(
            "| "
            f"`{node.address}` | {node.kind} | {node.service} | {node.category} | {node.scope} | "
            f"`{node.file}:{node.line}` |"
        )
    lines.append("")

    lines.append("## Edges")
    lines.append("")
    lines.append("| From | To | Relation |")
    lines.append("| --- | --- | --- |")
    for edge in edges:
        lines.append(f"| `{edge.from_address}` | `{edge.to_address}` | {edge.relation} |")

    return "\n".join(lines) + "\n"


def build_output(root: Path, nodes: list[Node], edges: list[Edge]) -> dict:
    return {
        "generated_at_utc": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "root": root.as_posix(),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes": [asdict(node) for node in nodes],
        "edges": [asdict(edge) for edge in edges],
    }


def write_output(content: str, output_path: Path | None) -> None:
    if output_path is None:
        print(content)
        return
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract Terraform graph for diagram generation")
    parser.add_argument("--root", default="infra", help="Root directory to scan for .tf files")
    parser.add_argument(
        "--format",
        choices=["json", "markdown"],
        default="json",
        help="Output format",
    )
    parser.add_argument("--output", default="", help="Output file path (default: stdout)")
    parser.add_argument("--include-data", action="store_true", help="Include data blocks as nodes")
    parser.add_argument("--include-modules", action="store_true", help="Include module blocks as nodes")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()

    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Root path does not exist or is not a directory: {root}")

    blocks: list[Block] = []
    for tf_file in list_tf_files(root):
        blocks.extend(parse_blocks(tf_file, root, args.include_data, args.include_modules))

    nodes = build_nodes(blocks)
    known_addresses = {node.address for node in nodes}
    edges = build_edges(blocks, known_addresses)

    output_path = Path(args.output).resolve() if args.output else None

    if args.format == "json":
        payload = build_output(root, nodes, edges)
        write_output(json.dumps(payload, indent=2), output_path)
    else:
        markdown = to_markdown(root, nodes, edges)
        write_output(markdown, output_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
