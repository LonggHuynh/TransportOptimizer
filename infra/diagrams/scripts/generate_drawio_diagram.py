#!/usr/bin/env python3
"""Generate a Draw.io diagram from the extracted Terraform graph."""

from __future__ import annotations

import argparse
import datetime as dt
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET


@dataclass(frozen=True)
class Node:
    address: str
    type: str
    service: str
    category: str
    scope: str
    file: str
    line: int


@dataclass(frozen=True)
class Edge:
    from_address: str
    to_address: str
    relation: str


CATEGORY_COLORS = {
    "networking": "#1A73E8",
    "compute": "#F29900",
    "storage": "#34A853",
    "database-cache": "#9C27B0",
    "security-identity": "#EA4335",
    "platform": "#5F6368",
    "module": "#7F8C8D",
    "kubernetes-app": "#F29900",
}

ADDRESS_LAYOUT = {
    "google_project_service.required": (320, 200),
    "google_compute_network.vpc": (520, 200),
    "google_compute_subnetwork.primary": (730, 160),
    "google_compute_subnetwork.gke": (730, 250),
    "google_compute_subnetwork.psc": (730, 340),
    "google_compute_router.nat_router": (940, 220),
    "google_compute_router_nat.nat": (1140, 170),
    "google_compute_router_nat.gke": (1140, 260),
    "google_container_cluster.primary": (1350, 220),
    "google_network_connectivity_service_connection_policy.redis": (1560, 220),
    "google_redis_cluster.redis": (1770, 220),
    "module.app": (620, 720),
    "helm_release.app": (840, 720),
    "google_compute_global_forwarding_rule.frontend": (340, 850),
    "google_compute_target_http_proxy.frontend": (560, 850),
    "google_compute_url_map.frontend": (780, 850),
    "google_compute_backend_bucket.frontend": (1000, 850),
    "google_storage_bucket.frontend": (1220, 850),
    "google_storage_bucket_iam_member.frontend_public_read": (1220, 955),
    "google_compute_global_address.frontend": (340, 965),
    "google_service_account.backend": (620, 1030),
    "google_service_account.worker": (840, 1030),
    "google_project_iam_member.backend_secret_access": (1060, 980),
    "google_project_iam_member.worker_secret_access": (1060, 1070),
    "google_project_iam_member.backend_redis_access": (1280, 980),
    "google_project_iam_member.worker_redis_access": (1280, 1070),
    "google_service_account_iam_member.backend_workload_identity": (1500, 980),
    "google_service_account_iam_member.worker_workload_identity": (1500, 1070),
}

ANNOTATIONS = [
    (920, 165, 210, 24, "per-env: stage/prod"),
    (920, 345, 220, 24, "shared: PSC subnet"),
    (1960, 225, 180, 24, "per-env: stage/prod"),
    (1520, 265, 220, 24, "shared foundation"),
    (1450, 725, 220, 24, "deploys app-chart"),
    (1450, 850, 220, 24, "per-env: stage/prod"),
]

SHAPE_BY_TYPE = {
    "google_project_service": "mxgraph.gcp2.cloud_apis",
    "google_compute_network": "mxgraph.gcp2.vpc_network",
    "google_compute_subnetwork": "mxgraph.gcp2.subnet",
    "google_compute_router": "mxgraph.gcp2.cloud_router",
    "google_compute_router_nat": "mxgraph.gcp2.cloud_nat",
    "google_container_cluster": "mxgraph.gcp2.google_kubernetes_engine",
    "google_network_connectivity_service_connection_policy": "mxgraph.gcp2.partner_interconnect",
    "google_redis_cluster": "mxgraph.gcp2.memorystore_for_redis",
    "google_storage_bucket": "mxgraph.gcp2.cloud_storage",
    "google_storage_bucket_iam_member": "mxgraph.gcp2.identity_and_access_management",
    "google_compute_backend_bucket": "mxgraph.gcp2.cloud_load_balancing",
    "google_compute_url_map": "mxgraph.gcp2.cloud_load_balancing",
    "google_compute_target_http_proxy": "mxgraph.gcp2.cloud_load_balancing",
    "google_compute_global_address": "mxgraph.gcp2.network_tier",
    "google_compute_global_forwarding_rule": "mxgraph.gcp2.cloud_load_balancing",
    "google_service_account": "mxgraph.gcp2.service_accounts",
    "google_project_iam_member": "mxgraph.gcp2.identity_and_access_management",
    "google_service_account_iam_member": "mxgraph.gcp2.identity_and_access_management",
    "helm_release": "mxgraph.kubernetes.helm",
    "module": "process",
}

EDGE_LABELS = {
    ("google_storage_bucket.frontend", "google_compute_backend_bucket.frontend"): "Backend Bucket",
    ("google_compute_backend_bucket.frontend", "google_compute_url_map.frontend"): "Default Service",
    ("google_compute_url_map.frontend", "google_compute_target_http_proxy.frontend"): "URL Map",
    ("google_compute_target_http_proxy.frontend", "google_compute_global_forwarding_rule.frontend"): "HTTP Proxy",
    ("google_compute_global_address.frontend", "google_compute_global_forwarding_rule.frontend"): "IP Address",
    ("google_storage_bucket.frontend", "google_storage_bucket_iam_member.frontend_public_read"): "Public Read IAM",
    ("google_compute_network.vpc", "google_compute_subnetwork.primary"): "Primary CIDR",
    ("google_compute_network.vpc", "google_compute_subnetwork.gke"): "GKE CIDR",
    ("google_compute_network.vpc", "google_compute_subnetwork.psc"): "PSC CIDR",
    ("google_compute_network.vpc", "google_compute_router.nat_router"): "VPC Attachment",
    ("google_compute_network.vpc", "google_container_cluster.primary"): "Cluster Network",
    ("google_compute_network.vpc", "google_network_connectivity_service_connection_policy.redis"): "Network",
    ("google_compute_network.vpc", "google_redis_cluster.redis"): "PSC Network",
    ("google_compute_router.nat_router", "google_compute_router_nat.nat"): "NAT",
    ("google_compute_router.nat_router", "google_compute_router_nat.gke"): "NAT",
    ("google_compute_subnetwork.primary", "google_compute_router_nat.nat"): "NAT Subnetwork",
    ("google_compute_subnetwork.gke", "google_compute_router_nat.gke"): "NAT Subnetwork",
    ("google_compute_subnetwork.gke", "google_container_cluster.primary"): "Subnetwork",
    ("google_compute_subnetwork.psc", "google_network_connectivity_service_connection_policy.redis"): "PSC",
    ("google_network_connectivity_service_connection_policy.redis", "google_redis_cluster.redis"): "Service Connection Policy",
    ("google_container_cluster.primary", "google_service_account_iam_member.backend_workload_identity"): "Workload Identity",
    ("google_container_cluster.primary", "google_service_account_iam_member.worker_workload_identity"): "Workload Identity",
    ("google_project_service.required", "google_compute_network.vpc"): "API Enablement",
    ("google_project_service.required", "google_compute_subnetwork.psc"): "API Enablement",
    ("google_project_service.required", "google_container_cluster.primary"): "API Enablement",
    ("google_project_service.required", "google_network_connectivity_service_connection_policy.redis"): "API Enablement",
    ("google_project_service.required", "google_compute_global_address.frontend"): "API Enablement",
    ("google_project_service.required", "google_service_account.backend"): "API Enablement",
    ("google_project_service.required", "google_service_account.worker"): "API Enablement",
    ("google_project_service.required", "google_storage_bucket.frontend"): "API Enablement",
    ("google_service_account.backend", "google_project_iam_member.backend_secret_access"): "IAM Binding",
    ("google_service_account.backend", "google_project_iam_member.backend_redis_access"): "IAM Binding",
    ("google_service_account.backend", "google_service_account_iam_member.backend_workload_identity"): "Workload Identity",
    ("google_service_account.worker", "google_project_iam_member.worker_secret_access"): "IAM Binding",
    ("google_service_account.worker", "google_project_iam_member.worker_redis_access"): "IAM Binding",
    ("google_service_account.worker", "google_service_account_iam_member.worker_workload_identity"): "Workload Identity",
    ("module.app", "helm_release.app"): "Module Input",
    ("external.users", "google_compute_global_forwarding_rule.frontend"): "HTTP :80",
}

DATA_EDGE_KEYS = {
    ("external.users", "google_compute_global_forwarding_rule.frontend"),
    ("google_compute_target_http_proxy.frontend", "google_compute_global_forwarding_rule.frontend"),
    ("google_compute_url_map.frontend", "google_compute_target_http_proxy.frontend"),
    ("google_compute_backend_bucket.frontend", "google_compute_url_map.frontend"),
    ("google_storage_bucket.frontend", "google_compute_backend_bucket.frontend"),
}

IDENTITY_EDGE_KEYS = {
    ("google_storage_bucket.frontend", "google_storage_bucket_iam_member.frontend_public_read"),
    ("google_container_cluster.primary", "google_service_account_iam_member.backend_workload_identity"),
    ("google_container_cluster.primary", "google_service_account_iam_member.worker_workload_identity"),
    ("google_service_account.backend", "google_project_iam_member.backend_secret_access"),
    ("google_service_account.backend", "google_project_iam_member.backend_redis_access"),
    ("google_service_account.backend", "google_service_account_iam_member.backend_workload_identity"),
    ("google_service_account.worker", "google_project_iam_member.worker_secret_access"),
    ("google_service_account.worker", "google_project_iam_member.worker_redis_access"),
    ("google_service_account.worker", "google_service_account_iam_member.worker_workload_identity"),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Draw.io from Terraform graph JSON")
    parser.add_argument("--graph-json", required=True, help="Path to extracted graph JSON")
    parser.add_argument("--drawio-output", required=True, help="Output Draw.io file path")
    parser.add_argument("--inventory-output", default="", help="Optional inventory markdown output path")
    return parser.parse_args()


def load_graph(graph_path: Path) -> tuple[list[Node], list[Edge]]:
    payload = json.loads(graph_path.read_text(encoding="utf-8"))
    nodes = [
        Node(
            address=item["address"],
            type=item["type"],
            service=item["service"],
            category=item["category"],
            scope=item["scope"],
            file=item["file"],
            line=item["line"],
        )
        for item in payload["nodes"]
    ]
    edges = [
        Edge(
            from_address=item["from_address"],
            to_address=item["to_address"],
            relation=item["relation"],
        )
        for item in payload["edges"]
    ]
    return nodes, edges


def dedupe_nodes(nodes: Iterable[Node]) -> tuple[list[Node], list[Node]]:
    grouped: dict[str, list[Node]] = {}
    for node in nodes:
        grouped.setdefault(node.address, []).append(node)

    selected: list[Node] = []
    omitted: list[Node] = []
    for address, variants in grouped.items():
        if len(variants) == 1:
            selected.append(variants[0])
            continue
        preferred = None
        if address == "helm_release.app":
            preferred = next((n for n in variants if n.file == "modules/app/main.tf"), None)
        if preferred is None:
            preferred = sorted(variants, key=lambda n: (n.file, n.line))[0]
        selected.append(preferred)
        for variant in variants:
            if variant != preferred:
                omitted.append(variant)
    return sorted(selected, key=lambda n: n.address), sorted(omitted, key=lambda n: (n.address, n.file, n.line))


def node_style(node: Node) -> str:
    stroke = CATEGORY_COLORS.get(node.category, "#5F6368")
    shape = SHAPE_BY_TYPE.get(node.type, "rectangle")
    return (
        f"shape={shape};whiteSpace=wrap;html=0;rounded=1;strokeWidth=2;"
        f"strokeColor={stroke};fillColor=#FFFFFF;fontColor=#202124;fontSize=11;"
        "align=center;verticalAlign=middle;"
    )


def boundary_style(fill_color: str, dashed: bool) -> str:
    dashed_text = "dashed=1;" if dashed else ""
    return (
        "rounded=1;whiteSpace=wrap;html=0;fontColor=#202124;align=left;"
        f"strokeColor=#DADCE0;fillColor={fill_color};strokeWidth=2;{dashed_text}"
    )


def annotation_style() -> str:
    return "text;html=0;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontColor=#5F6368;fontSize=11;"


def legend_style(color: str) -> str:
    return f"rounded=0;whiteSpace=wrap;html=0;strokeColor={color};fillColor={color};"


def edge_style(pair: tuple[str, str]) -> str:
    if pair in DATA_EDGE_KEYS:
        color = "#34A853"
        dashed = "0"
    elif pair in IDENTITY_EDGE_KEYS:
        color = "#9AA0A6"
        dashed = "1"
    else:
        color = "#1A73E8"
        dashed = "0"
    return (
        "endArrow=block;endFill=1;html=0;rounded=0;edgeStyle=orthogonalEdgeStyle;"
        f"strokeColor={color};strokeWidth=2;dashed={dashed};fontSize=11;"
    )


class DrawIoBuilder:
    def __init__(self) -> None:
        self.mxfile = ET.Element(
            "mxfile",
            attrib={
                "host": "app.diagrams.net",
                "modified": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
                "agent": "codex-gpt5",
                "version": "24.7.17",
            },
        )
        self.diagram = ET.SubElement(self.mxfile, "diagram", attrib={"id": "transportoptimizer-gcp", "name": "Terraform Infra"})
        self.model = ET.Element(
            "mxGraphModel",
            attrib={
                "dx": "1800",
                "dy": "1200",
                "grid": "1",
                "gridSize": "10",
                "guides": "1",
                "tooltips": "1",
                "connect": "1",
                "arrows": "1",
                "fold": "1",
                "page": "1",
                "pageScale": "1",
                "pageWidth": "2800",
                "pageHeight": "1600",
                "math": "0",
                "shadow": "0",
            },
        )
        self.root = ET.SubElement(self.model, "root")
        ET.SubElement(self.root, "mxCell", attrib={"id": "0"})
        ET.SubElement(self.root, "mxCell", attrib={"id": "1", "parent": "0"})
        self.id_counter = 2
        self.node_cell_id: dict[str, str] = {}

    def next_id(self) -> str:
        current = str(self.id_counter)
        self.id_counter += 1
        return current

    def add_vertex(self, cell_key: str, label: str, style: str, x: int, y: int, w: int, h: int, parent: str = "1") -> str:
        cell_id = self.next_id()
        self.node_cell_id[cell_key] = cell_id
        cell = ET.SubElement(
            self.root,
            "mxCell",
            attrib={"id": cell_id, "value": label, "style": style, "vertex": "1", "parent": parent},
        )
        ET.SubElement(cell, "mxGeometry", attrib={"x": str(x), "y": str(y), "width": str(w), "height": str(h), "as": "geometry"})
        return cell_id

    def add_edge(self, source_key: str, target_key: str, label: str, style: str, parent: str = "1") -> None:
        source = self.node_cell_id[source_key]
        target = self.node_cell_id[target_key]
        edge = ET.SubElement(
            self.root,
            "mxCell",
            attrib={
                "id": self.next_id(),
                "value": label,
                "style": style,
                "edge": "1",
                "parent": parent,
                "source": source,
                "target": target,
            },
        )
        ET.SubElement(edge, "mxGeometry", attrib={"relative": "1", "as": "geometry"})

    def to_xml(self) -> str:
        self.diagram.text = ET.tostring(self.model, encoding="unicode")
        return ET.tostring(self.mxfile, encoding="unicode")


def display_label(node: Node) -> str:
    if node.address == "helm_release.app":
        return "Helm Release app"
    if node.address == "module.app":
        return "Terraform Module app"
    return node.service


def write_inventory(nodes: list[Node], edges: list[Edge], omitted_nodes: list[Node], path: Path) -> None:
    lines: list[str] = []
    lines.append("# TransportOptimizer Terraform Diagram Inventory")
    lines.append("")
    lines.append(f"- Generated: `{dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()}`")
    lines.append(f"- Diagrammed resources: `{len(nodes)}`")
    lines.append(f"- Diagrammed edges: `{len(edges) + 2}`")
    lines.append(f"- Omitted resources: `{len(omitted_nodes)}`")
    lines.append("")
    lines.append("## Diagrammed Resources")
    lines.append("")
    for node in nodes:
        lines.append(f"- `{node.address}` ({node.file}:{node.line})")
    lines.append("")
    lines.append("## Gap List")
    lines.append("")
    if not omitted_nodes:
        lines.append("- None")
    else:
        for node in omitted_nodes:
            lines.append(f"- Omitted duplicate `{node.address}` from `{node.file}:{node.line}`")
    lines.append("")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    args = parse_args()
    graph_path = Path(args.graph_json).resolve()
    drawio_output_path = Path(args.drawio_output).resolve()
    inventory_path = Path(args.inventory_output).resolve() if args.inventory_output else None

    nodes, graph_edges = load_graph(graph_path)
    selected_nodes, omitted_nodes = dedupe_nodes(nodes)
    node_by_address = {node.address: node for node in selected_nodes}

    builder = DrawIoBuilder()
    builder.add_vertex("boundary.gcp", "Google Cloud Project", boundary_style("#F8F9FA", dashed=False), 220, 80, 2200, 1120)
    builder.add_vertex("boundary.shared", "Shared Foundation", boundary_style("#FFFFFF", dashed=True), 260, 130, 2120, 500)
    builder.add_vertex("boundary.env", "Per-Environment stage/prod", boundary_style("#FFFFFF", dashed=True), 260, 660, 2120, 500)
    builder.add_vertex("external.users", "Users", "shape=mxgraph.basic.actor;whiteSpace=wrap;html=0;strokeColor=#202124;fillColor=#FFFFFF;", 40, 850, 120, 80)

    fallback_x = 1770
    fallback_y = 720
    fallback_step = 90
    for node in selected_nodes:
        x, y = ADDRESS_LAYOUT.get(node.address, (fallback_x, fallback_y))
        if node.address not in ADDRESS_LAYOUT:
            fallback_y += fallback_step
        builder.add_vertex(node.address, display_label(node), node_style(node), x, y, 160, 72)

    for index, (x, y, w, h, text) in enumerate(ANNOTATIONS):
        builder.add_vertex(f"annotation.{index}", text, annotation_style(), x, y, w, h)

    legend_items = [
        ("networking", "Networking"),
        ("compute", "Compute / Containers"),
        ("storage", "Storage"),
        ("database-cache", "Database / Cache"),
        ("security-identity", "Security / Identity"),
        ("platform", "Platform / APIs"),
    ]
    legend_y = 1220
    builder.add_vertex("legend.title", "Legend", annotation_style(), 300, legend_y - 28, 120, 22)
    for index, (category, label) in enumerate(legend_items):
        x = 420 + index * 300
        builder.add_vertex(f"legend.box.{index}", "", legend_style(CATEGORY_COLORS[category]), x, legend_y, 18, 18)
        builder.add_vertex(f"legend.label.{index}", label, annotation_style(), x + 26, legend_y - 2, 240, 22)

    filtered_edges: list[Edge] = []
    for edge in graph_edges:
        if edge.from_address in node_by_address and edge.to_address in node_by_address:
            filtered_edges.append(edge)
            pair = (edge.from_address, edge.to_address)
            builder.add_edge(edge.from_address, edge.to_address, EDGE_LABELS.get(pair, "Reference"), edge_style(pair))

    builder.add_edge("module.app", "helm_release.app", EDGE_LABELS[("module.app", "helm_release.app")], edge_style(("module.app", "helm_release.app")))
    builder.add_edge("external.users", "google_compute_global_forwarding_rule.frontend", EDGE_LABELS[("external.users", "google_compute_global_forwarding_rule.frontend")], edge_style(("external.users", "google_compute_global_forwarding_rule.frontend")))

    drawio_output_path.parent.mkdir(parents=True, exist_ok=True)
    drawio_output_path.write_text(builder.to_xml(), encoding="utf-8")

    if inventory_path is not None:
        write_inventory(selected_nodes, filtered_edges, omitted_nodes, inventory_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
