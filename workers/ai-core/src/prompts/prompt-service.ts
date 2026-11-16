import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

export interface PromptVariable {
  name: string;
  required: boolean;
}

export interface PromptVersion {
  id: string;
  template_id: string;
  version: number;
  body: string;
  variables: PromptVariable[];
  created_at: string;
}

export class PromptServiceError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "PromptServiceError";
  }
}

function invalid(message: string): never {
  throw new PromptServiceError("PROMPT_VALIDATION_ERROR", 400, message);
}

function objectValue(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalid("Request body must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

function validateVariables(value: unknown): PromptVariable[] {
  if (!Array.isArray(value) || value.length > 50) {
    return invalid("variables must be an array with at most 50 entries.");
  }
  const names = new Set<string>();
  return value.map((item) => {
    const variable = objectValue(item);
    if (typeof variable.name !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(variable.name)) {
      return invalid("Each variable name must start with a letter and contain only letters, numbers or underscore.");
    }
    if (names.has(variable.name)) return invalid("Duplicate prompt variable: " + variable.name);
    names.add(variable.name);
    if (variable.required !== undefined && typeof variable.required !== "boolean") {
      return invalid("Variable required must be boolean.");
    }
    return { name: variable.name, required: variable.required !== false };
  });
}

function validateBody(value: unknown): { body: string; variables: PromptVariable[] } {
  const input = objectValue(value);
  if (typeof input.body !== "string" || input.body.trim().length === 0 || input.body.length > 20000) {
    return invalid("body must contain 1-20000 characters.");
  }
  const variables = validateVariables(input.variables ?? []);
  const declared = new Set(variables.map((item) => item.name));
  const used = new Set<string>();
  for (const match of input.body.matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g)) {
    const name = match[1];
    if (name) {
      if (!declared.has(name)) return invalid("Undeclared prompt variable: " + name);
      used.add(name);
    }
  }
  for (const variable of variables) {
    if (!used.has(variable.name)) return invalid("Declared prompt variable is not used: " + variable.name);
  }
  return { body: input.body, variables };
}

function createVersion(db: Database.Database, templateId: string, projectId: string, body: string, variables: PromptVariable[]): PromptVersion {
  const next = db.prepare(
    "SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM prompt_template_versions WHERE template_id = ? AND project_id = ?"
  ).get(templateId, projectId) as { next_version: number };
  const id = "pv_" + randomUUID().replaceAll("-", "");
  db.prepare(
    "INSERT INTO prompt_template_versions(id,template_id,project_id,version,body,variables_json) VALUES(?,?,?,?,?,?)"
  ).run(id, templateId, projectId, next.next_version, body, JSON.stringify(variables));
  db.prepare("UPDATE prompt_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND project_id = ?")
    .run(templateId, projectId);
  return {
    id,
    template_id: templateId,
    version: next.next_version,
    body,
    variables,
    created_at: new Date().toISOString()
  };
}

export function createPrompt(db: Database.Database, projectId: string, value: unknown) {
  const input = objectValue(value);
  if (input.project !== projectId) {
    throw new PromptServiceError("PROJECT_FORBIDDEN", 403, "API key is not authorized for this project.");
  }
  if (typeof input.name !== "string" || input.name.trim().length < 1 || input.name.length > 120) {
    return invalid("name must contain 1-120 characters.");
  }
  if (input.description !== undefined && (typeof input.description !== "string" || input.description.length > 500)) {
    return invalid("description must be a string of at most 500 characters.");
  }
  const versionInput = validateBody(input);
  const id = "prompt_" + randomUUID().replaceAll("-", "");
  const transaction = db.transaction(() => {
    db.prepare(
      "INSERT INTO prompt_templates(id,project_id,name,description) VALUES(?,?,?,?)"
    ).run(id, projectId, input.name.trim(), typeof input.description === "string" ? input.description : null);
    const version = createVersion(db, id, projectId, versionInput.body, versionInput.variables);
    return version;
  });
  const version = transaction();
  return { id, project_id: projectId, name: input.name.trim(), description: input.description ?? null, status: "active", version };
}

export function listPrompts(db: Database.Database, projectId: string) {
  return db.prepare(
    "SELECT p.id,p.name,p.description,p.status,p.created_at,p.updated_at,(SELECT MAX(v.version) FROM prompt_template_versions v WHERE v.template_id=p.id) AS latest_version FROM prompt_templates p WHERE p.project_id=? ORDER BY p.updated_at DESC"
  ).all(projectId);
}

export function getPrompt(db: Database.Database, projectId: string, templateId: string) {
  const template = db.prepare(
    "SELECT id,project_id,name,description,status,created_at,updated_at FROM prompt_templates WHERE id=? AND project_id=?"
  ).get(templateId, projectId);
  if (!template) throw new PromptServiceError("PROMPT_NOT_FOUND", 404, "Prompt template not found.");
  const versions = db.prepare(
    "SELECT id,template_id,version,body,variables_json,created_at FROM prompt_template_versions WHERE template_id=? AND project_id=? ORDER BY version DESC"
  ).all(templateId, projectId) as Array<{ id: string; template_id: string; version: number; body: string; variables_json: string; created_at: string }>;
  return {
    ...template,
    versions: versions.map((version) => ({
      id: version.id,
      template_id: version.template_id,
      version: version.version,
      body: version.body,
      variables: JSON.parse(version.variables_json) as PromptVariable[],
      created_at: version.created_at
    }))
  };
}

export function addPromptVersion(db: Database.Database, projectId: string, templateId: string, value: unknown) {
  const input = validateBody(value);
  const exists = db.prepare("SELECT id FROM prompt_templates WHERE id=? AND project_id=? AND status='active'")
    .get(templateId, projectId);
  if (!exists) throw new PromptServiceError("PROMPT_NOT_FOUND", 404, "Active prompt template not found.");
  const transaction = db.transaction(() => createVersion(db, templateId, projectId, input.body, input.variables));
  return transaction();
}

export function renderPrompt(db: Database.Database, projectId: string, templateId: string, value: unknown) {
  const input = objectValue(value);
  const versionNumber = input.version;
  if (versionNumber !== undefined && (!Number.isInteger(versionNumber) || Number(versionNumber) < 1)) {
    return invalid("version must be a positive integer.");
  }
  if (typeof input.variables !== "object" || input.variables === null || Array.isArray(input.variables)) {
    return invalid("variables must be an object containing string values.");
  }
  const supplied = input.variables as Record<string, unknown>;
  const query = versionNumber === undefined
    ? "SELECT id,version,body,variables_json FROM prompt_template_versions WHERE template_id=? AND project_id=? ORDER BY version DESC LIMIT 1"
    : "SELECT id,version,body,variables_json FROM prompt_template_versions WHERE template_id=? AND project_id=? AND version=?";
  const row = (versionNumber === undefined
    ? db.prepare(query).get(templateId, projectId)
    : db.prepare(query).get(templateId, projectId, versionNumber)) as { id: string; version: number; body: string; variables_json: string } | undefined;
  if (!row) throw new PromptServiceError("PROMPT_VERSION_NOT_FOUND", 404, "Prompt template version not found.");
  const declared = JSON.parse(row.variables_json) as PromptVariable[];
  const allowed = new Set(declared.map((variable) => variable.name));
  for (const key of Object.keys(supplied)) {
    if (!allowed.has(key)) return invalid("Unknown prompt variable: " + key);
    if (typeof supplied[key] !== "string") return invalid("Prompt variable values must be strings.");
  }
  for (const variable of declared) {
    if (variable.required && (typeof supplied[variable.name] !== "string" || supplied[variable.name] === "")) {
      return invalid("Required prompt variable is missing: " + variable.name);
    }
  }
  let output = row.body;
  for (const variable of declared) {
    const value = typeof supplied[variable.name] === "string" ? supplied[variable.name] as string : "";
    output = output.replaceAll(new RegExp("\\{\\{\\s*" + variable.name + "\\s*\\}\\}", "g"), value);
  }
  return { template_id: templateId, version_id: row.id, version: row.version, output };
}
