import type * as FsPromises from "fs/promises";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

import type { Template } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { defaultTemplates } from "../defaultTemplates";
import type { BackendSDK } from "../types";

import { TemplatesService } from "./templates";

vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return { ...actual, rm: vi.fn(actual.rm) };
});

const custom: Template = {
  id: "custom",
  description: "Custom",
  enabled: true,
  modificationScript: "return input;",
};

describe("templates service", () => {
  let dir: string;

  beforeEach(async () => {
    dir = path.join(
      await mkdtemp(path.join(tmpdir(), "bypasser-")),
      "templates",
    );
  });

  const setup = () => {
    const onChange = vi.fn();
    const onLoadError = vi.fn();
    const sdk = {
      meta: { path: () => path.dirname(dir) },
      api: { send: (_: string, list: Template[]) => onChange(list) },
      console: { error: onLoadError },
    } as unknown as BackendSDK;
    return { service: new TemplatesService(sdk), onChange, onLoadError };
  };

  it("seeds the default templates on first run only", async () => {
    const { service } = setup();
    await service.load();
    expect(service.list()).toHaveLength(defaultTemplates.length);

    await service.remove(defaultTemplates[0]!.id);
    const reloaded = setup().service;
    await reloaded.load();
    expect(reloaded.list()).toHaveLength(defaultTemplates.length - 1);
  });

  it("loads existing files and reports invalid ones", async () => {
    await mkdir(dir);
    await writeFile(
      path.join(dir, "custom.yaml"),
      "id: custom\nenabled: true\nmodificationScript: return input;\n",
    );
    await writeFile(path.join(dir, "broken.yaml"), "id: broken\n");
    await writeFile(
      path.join(dir, "renamed.yaml"),
      "id: other\nenabled: true\nmodificationScript: x\n",
    );

    const { service, onLoadError } = setup();
    await service.load();

    expect(service.list()).toEqual([{ ...custom, description: "" }]);
    expect(onLoadError).toHaveBeenCalledTimes(2);
  });

  it("creates, renames and deletes template files", async () => {
    const { service, onChange } = setup();
    await service.load();
    await service.clear();

    expect(await service.save(undefined, custom)).toEqual({
      kind: "Ok",
      value: custom,
    });
    expect((await service.save(undefined, custom)).kind).toBe("Error");

    await service.save("custom", { ...custom, id: "renamed" });
    expect(await readdir(dir)).toEqual(["renamed.yaml"]);
    expect(await readFile(path.join(dir, "renamed.yaml"), "utf-8")).toBe(
      "id: renamed\ndescription: Custom\nenabled: true\nmodificationScript: return input;\n",
    );

    await service.remove("renamed");
    expect(await readdir(dir)).toEqual([]);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("treats IDs differing only in case as the same file", async () => {
    const { service } = setup();
    await service.load();
    await service.clear();
    await service.save(undefined, custom);

    expect(
      (await service.save(undefined, { ...custom, id: "CUSTOM" })).kind,
    ).toBe("Error");
    vi.mocked(rm).mockClear();
    await service.save("custom", { ...custom, id: "Custom" });
    expect(rm).toHaveBeenCalledTimes(1);
    expect(await readdir(dir)).toEqual(["Custom.yaml"]);
    expect(service.list().map((t) => t.id)).toEqual(["Custom"]);
  });

  it("rejects invalid templates and unknown IDs", async () => {
    const { service } = setup();
    await service.load();

    expect(
      (await service.save(undefined, { ...custom, id: "../evil" })).kind,
    ).toBe("Error");
    expect((await service.save("missing", custom)).kind).toBe("Error");
    expect((await service.remove("../evil")).kind).toBe("Error");
  });

  it("round-trips templates through YAML", async () => {
    const { service } = setup();
    await service.load();
    await service.clear();
    await service.save(undefined, {
      ...custom,
      modificationScript: "const a = 1;\nreturn input;",
    });

    const exported = service.exportYaml("custom");
    await service.clear();
    expect(exported.kind === "Ok" && exported.value).toContain(
      "modificationScript: |-\n  const a = 1;\n  return input;",
    );
    const imported = await service.importYaml(
      exported.kind === "Ok" ? exported.value : "",
    );
    expect(imported).toEqual({
      kind: "Ok",
      value: { ...custom, modificationScript: "const a = 1;\nreturn input;" },
    });
    expect((await service.importYaml("id: [")).kind).toBe("Error");
  });

  it("resets to the default templates", async () => {
    const { service } = setup();
    await service.load();
    await service.save(undefined, custom);

    await service.reset();
    expect(service.list().map((t) => t.id)).toEqual(
      defaultTemplates.map((t) => t.id).sort(),
    );
    expect(await readdir(dir)).toHaveLength(defaultTemplates.length);
  });
});
