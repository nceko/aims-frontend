#!/usr/bin/env python3
"""Generate frontend API metadata from a Swagger 2.0 document.

Usage:
    python scripts/generate-api-metadata.py /path/to/swagger.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

HTTP_METHODS = {"get", "post", "put", "patch", "delete"}


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: generate-api-metadata.py <swagger.json>")

    swagger_path = Path(sys.argv[1]).resolve()
    swagger = load_json(swagger_path)
    definitions = swagger.get("definitions", {})

    def resolve_schema(schema: Any, stack: tuple[str, ...] = ()) -> Any:
        if not isinstance(schema, dict):
            return schema
        if "$ref" in schema:
            ref = str(schema["$ref"])
            name = ref.rsplit("/", 1)[-1]
            if name in stack:
                return {"type": "object", "ref": name}
            resolved = resolve_schema(definitions.get(name, {}), (*stack, name))
            if isinstance(resolved, dict):
                return {**resolved, "ref": name}
            return resolved

        result: dict[str, Any] = {}
        for key in (
            "type",
            "format",
            "description",
            "example",
            "default",
            "minimum",
            "maximum",
            "readOnly",
        ):
            if key in schema:
                result[key] = schema[key]
        if "enum" in schema:
            result["enum"] = schema["enum"]
        if "required" in schema:
            result["required"] = schema["required"]
        if "properties" in schema:
            result["properties"] = {
                name: resolve_schema(value, stack)
                for name, value in schema.get("properties", {}).items()
            }
        if "items" in schema:
            result["items"] = resolve_schema(schema["items"], stack)
        if "allOf" in schema:
            merged: dict[str, Any] = {}
            required: list[str] = []
            properties: dict[str, Any] = {}
            for entry in schema["allOf"]:
                resolved = resolve_schema(entry, stack)
                if not isinstance(resolved, dict):
                    continue
                properties.update(resolved.get("properties", {}))
                required.extend(resolved.get("required", []))
                for key, value in resolved.items():
                    if key not in {"properties", "required", "ref"}:
                        merged[key] = value
            if properties:
                merged["properties"] = properties
            if required:
                merged["required"] = list(dict.fromkeys(required))
            result = {**merged, **result}
        if not result and schema:
            # Preserve a usable object shape for schemas that Swagger leaves implicit.
            result["type"] = schema.get("type", "object")
        return result

    operations: dict[str, Any] = {}
    for path, methods in swagger.get("paths", {}).items():
        if not isinstance(methods, dict):
            continue
        shared_parameters = methods.get("parameters", [])
        for method, operation in methods.items():
            if method.lower() not in HTTP_METHODS or not isinstance(operation, dict):
                continue
            operation_id = operation.get("operationId")
            if not operation_id:
                continue
            parameters = [*shared_parameters, *operation.get("parameters", [])]
            body = None
            normalized_parameters: list[dict[str, Any]] = []
            for parameter in parameters:
                if not isinstance(parameter, dict):
                    continue
                if parameter.get("in") == "body":
                    body = resolve_schema(parameter.get("schema", {}))
                    continue
                item = {
                    "name": parameter.get("name", ""),
                    "in": parameter.get("in", "query"),
                    "type": parameter.get("type"),
                    "format": parameter.get("format"),
                    "required": parameter.get("required", False),
                    "description": parameter.get("description", ""),
                }
                for key in ("enum", "default"):
                    if key in parameter:
                        item[key] = parameter[key]
                normalized_parameters.append({k: v for k, v in item.items() if v is not None})

            response_schema = None
            responses = operation.get("responses", {})
            for code in sorted(responses, key=lambda value: (not str(value).startswith("2"), str(value))):
                response = responses.get(code, {})
                if isinstance(response, dict) and response.get("schema"):
                    response_schema = resolve_schema(response["schema"])
                    break

            operations[operation_id] = {
                "operationId": operation_id,
                "method": method.upper(),
                "path": path,
                "summary": operation.get("summary", ""),
                "description": operation.get("description", ""),
                "tags": operation.get("tags", []),
                "parameters": normalized_parameters,
                "body": body,
                "response": response_schema,
            }

    output = {
        "generatedFrom": swagger_path.name,
        "operationCount": len(operations),
        "operations": dict(sorted(operations.items())),
    }
    target = Path("src/generated/api-metadata.json")
    target.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Generated {len(operations)} operations into {target}")


if __name__ == "__main__":
    main()
