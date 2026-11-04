import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

import { err, ok, type Result, type Template, templateSchema } from "shared";
import YAML from "yaml";
import { z } from "zod";

import { defaultTemplates } from "../defaultTemplates";

type Options = {
  dir: string;
  onChange: (templates: Template[]) => void;
  onLoadError: (message: string) => void;
};

export class TemplatesService {
  private readonly templates = new Map<string, Template>();

  constructor(private readonly options: Options) {}

  list() {
    return [...this.templates.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
  }

  async load() {
    const { dir, onLoadError } = this.options;
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
      if (path.extname(file).toLowerCase() !== ".yaml") {
        continue;
      }

      try {
        const parsed = templateSchema.safeParse(
          YAML.parse(await readFile(path.join(dir, file), "utf-8")),
        );
        if (!parsed.success) {
          onLoadError(
            `Invalid template ${file}: ${z.prettifyError(parsed.error)}`,
          );
        } else if (`${parsed.data.id}.yaml` !== file) {
          onLoadError(`Template ${file} must be named ${parsed.data.id}.yaml`);
        } else {
          this.templates.set(parsed.data.id, parsed.data);
        }
      } catch (error) {
        onLoadError(`Failed to load template ${file}: ${String(error)}`);
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
    if (template.id !== previousId && this.templates.has(template.id)) {
      return err(`Template ${template.id} already exists`);
    }

    await this.write(template);
    if (previousId !== undefined && previousId !== template.id) {
      await rm(this.fileOf(previousId));
      this.templates.delete(previousId);
    }
    this.changed();
    return ok(template);
  }

  async remove(id: string): Promise<Result<void>> {
    if (!this.templates.has(id)) {
      return err(`Template ${id} not found`);
    }

    await rm(this.fileOf(id));
    this.templates.delete(id);
    this.changed();
    return ok(undefined);
  }

  async importYaml(yaml: string): Promise<Result<Template>> {
    let data: unknown;
    try {
      data = YAML.parse(yaml);
    } catch (error) {
      return err(`Invalid YAML: ${String(error)}`);
    }
    return this.save(undefined, data);
  }

  exportYaml(id: string): Result<string> {
    const template = this.templates.get(id);
    return template === undefined
      ? err(`Template ${id} not found`)
      : ok(YAML.stringify(template));
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
    return path.join(this.options.dir, `${id}.yaml`);
  }

  private changed() {
    this.options.onChange(this.list());
  }

  private async write(template: Template) {
    await writeFile(this.fileOf(template.id), YAML.stringify(template));
    this.templates.set(template.id, template);
  }

  private async writeDefaults() {
    for (const template of defaultTemplates) {
      await this.write(template);
    }
  }

  private async removeAll() {
    for (const id of this.templates.keys()) {
      await rm(this.fileOf(id));
    }
    this.templates.clear();
  }
}
