import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

import { dump, load } from "js-yaml";
import { err, ok, type Result, type Template, templateSchema } from "shared";
import { z } from "zod";

import { defaultTemplates } from "../defaultTemplates";
import type { BackendSDK } from "../types";

const toYaml = (template: Template) => dump(template, { lineWidth: -1 });

const sameFileName = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase();

export class TemplatesService {
  private readonly templates = new Map<string, Template>();
  private readonly dir: string;

  constructor(private readonly sdk: BackendSDK) {
    this.dir = path.join(sdk.meta.path(), "templates");
  }

  list() {
    return [...this.templates.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
  }

  async load() {
    const { dir } = this;
    // Caido's fs has no existsSync and its errors carry no `code`, so check presence via readdir.
    const isFirstRun = !(await readdir(path.dirname(dir))).includes(
      path.basename(dir),
    );
    if (isFirstRun) {
      await mkdir(dir, { recursive: true });
      await this.writeDefaults();
      this.changed();
      return;
    }

    for (const file of await readdir(dir)) {
      if (!file.endsWith(".yaml")) {
        continue;
      }

      try {
        const parsed = templateSchema.safeParse(
          load(await readFile(path.join(dir, file), "utf-8")),
        );
        if (!parsed.success) {
          this.sdk.console.error(
            `Invalid template ${file}: ${z.prettifyError(parsed.error)}`,
          );
        } else if (`${parsed.data.id}.yaml` !== file) {
          this.sdk.console.error(
            `Template ${file} must be named ${parsed.data.id}.yaml`,
          );
        } else {
          this.templates.set(parsed.data.id, parsed.data);
        }
      } catch (error) {
        this.sdk.console.error(
          `Failed to load template ${file}: ${String(error)}`,
        );
      }
    }
    this.changed();
  }

  async save(
    previousId: string | undefined,
    input: unknown,
  ): Promise<Result<Template>> {
    const parsed = templateSchema.safeParse(input);
    if (!parsed.success) {
      return err(z.prettifyError(parsed.error));
    }

    const template = parsed.data;
    if (previousId !== undefined && !this.templates.has(previousId)) {
      return err(`Template ${previousId} not found`);
    }
    const isTaken = [...this.templates.keys()].some(
      (id) => id !== previousId && sameFileName(id, template.id),
    );
    if (isTaken) {
      return err(`Template ${template.id} already exists`);
    }

    const isRename = previousId !== undefined && previousId !== template.id;
    // A case-only rename is the same file on case-insensitive filesystems.
    const isSameFile = isRename && sameFileName(previousId, template.id);
    if (isSameFile) {
      await this.removeFile(previousId);
    }
    await this.write(template);
    if (isRename) {
      if (!isSameFile) {
        await this.removeFile(previousId);
      }
      this.templates.delete(previousId);
    }
    this.changed();
    return ok(template);
  }

  async remove(id: string): Promise<Result<void>> {
    if (!this.templates.has(id)) {
      return err(`Template ${id} not found`);
    }

    await this.removeFile(id);
    this.templates.delete(id);
    this.changed();
    return ok(undefined);
  }

  async importYaml(yaml: string): Promise<Result<Template>> {
    let data: unknown;
    try {
      data = load(yaml);
    } catch (error) {
      return err(`Invalid YAML: ${String(error)}`);
    }
    return this.save(undefined, data);
  }

  exportYaml(id: string): Result<string> {
    const template = this.templates.get(id);
    return template === undefined
      ? err(`Template ${id} not found`)
      : ok(toYaml(template));
  }

  async reset() {
    await this.removeAll();
    await this.writeDefaults();
    this.changed();
  }

  async clear() {
    await this.removeAll();
    this.changed();
  }

  private fileOf(id: string) {
    return path.join(this.dir, `${id}.yaml`);
  }

  private removeFile(id: string) {
    return rm(this.fileOf(id), { force: true });
  }

  private changed() {
    this.sdk.api.send("templates:changed", this.list());
  }

  private async write(template: Template) {
    await writeFile(this.fileOf(template.id), toYaml(template));
    this.templates.set(template.id, template);
  }

  private async writeDefaults() {
    for (const template of defaultTemplates) {
      await this.write(template);
    }
  }

  private async removeAll() {
    for (const id of this.templates.keys()) {
      await this.removeFile(id);
    }
    this.templates.clear();
  }
}
