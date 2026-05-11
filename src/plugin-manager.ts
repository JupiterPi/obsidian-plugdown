import AdmZip from "adm-zip";
import type Plugin from "./main";
import z from "zod";
import { App, normalizePath, type ObsidianProtocolData } from "obsidian";

const LinkParams = z.object({
  download_url: z.string().transform((str) => decodeURIComponent(str)),
  initial_data: z
    .string()
    .transform((str, ctx) => {
      try {
        return JSON.parse(decodeURIComponent(str));
      } catch (e) {
        ctx.issues.push({
          code: "custom",
          message: "initial_data is not valid JSON",
          input: str,
        });
        return z.NEVER;
      }
    })
    .optional(),
});
export type LinkParams = z.infer<typeof LinkParams>;

export type DownloadedPlugin = {
  id: string;
  name: string;
  description: string;
  isAlreadyInstalled: boolean;
  initialData: any | null;
  zip: AdmZip;
};

export class PluginManager {
  constructor(private plugin: Plugin) {}

  safelyParseLinkParams(e: ObsidianProtocolData) {
    return LinkParams.safeParse(e as unknown);
  }

  stringifyLinkParams(downloadUrl: string, initialData?: any) {
    let link = `obsidian://plugdown-install?download_url=${encodeURIComponent(downloadUrl)}`;
    if (initialData) {
      link += `&initial_data=${encodeURIComponent(JSON.stringify(initialData))}`;
    }
    return link;
  }

  async downloadPlugin(linkParams: LinkParams): Promise<DownloadedPlugin> {
    const response = await fetch(linkParams.download_url, {
      signal: AbortSignal.timeout(15000), // 15s timeout
    });
    if (!response.ok) {
      throw new Error(
        `Failed to download plugin: ${response.status} ${response.statusText}`,
      );
    }
    const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));

    if (zip.getEntry("manifest.json") === null) {
      throw new Error("Invalid plugin zip: missing manifest.json");
    }
    const manifest = z
      .object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
      })
      .parse(JSON.parse(zip.readAsText("manifest.json")));

    const pluginDir =
      this.plugin.app.vault.configDir + "/plugins/" + manifest.id;
    const isAlreadyInstalled =
      await this.plugin.app.vault.adapter.exists(pluginDir);

    return {
      ...manifest,
      isAlreadyInstalled,
      initialData: linkParams.initial_data,
      zip,
    };
  }

  async installPlugin(downloadedPlugin: DownloadedPlugin) {
    const {
      id: pluginId,
      zip,
      isAlreadyInstalled,
      initialData,
    } = downloadedPlugin;
    const pluginDir = this.plugin.app.vault.configDir + "/plugins/" + pluginId;

    // delete old version
    if (isAlreadyInstalled) {
      await this.plugin.app.vault.adapter.rmdir(pluginDir, true);
    }

    // extract files
    await this.plugin.app.vault.adapter.mkdir(pluginDir);
    const entries = zip.getEntries();
    for (const dir of entries.filter((e) => e.isDirectory)) {
      await this.plugin.app.vault.adapter.mkdir(
        pluginDir + "/" + dir.entryName,
      );
    }
    await Promise.all(
      entries
        .filter((e) => !e.isDirectory)
        .map(async (entry) => {
          const data = entry.getData();
          const dataBuffer = data.buffer.slice(
            data.byteOffset,
            data.byteOffset + data.byteLength,
          ) as ArrayBuffer; // todo: this seems to work, but is it always correct?
          await this.plugin.app.vault.adapter.writeBinary(
            pluginDir + "/" + entry.entryName,
            dataBuffer,
          );
        }),
    );

    // write initial data if provided
    if (initialData !== undefined) {
      await this.plugin.app.vault.adapter.write(
        pluginDir + "/data.json",
        JSON.stringify(initialData, null, 2),
      );
    }

    await enablePlugin(this.plugin.app, pluginId, isAlreadyInstalled);
  }
}

// see https://github.com/TfTHacker/obsidian42-brat/blob/516570a6f95aa7baf218459c5519373cd9cb03ea/src/features/BetaPlugins.ts#L617-L623
async function enablePlugin(app: App, pluginId: string, reload: boolean) {
  // @ts-expect-error
  const { plugins } = app;
  if (reload) {
    await plugins.disablePlugin(pluginId);
  }
  await plugins.loadManifest(
    normalizePath(`${plugins.getPluginFolder()}/${pluginId}`),
  );
  await plugins.enablePluginAndSave(pluginId);
}
