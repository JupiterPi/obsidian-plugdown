import AdmZip from "adm-zip";
import type Plugin from "./main";
import z from "zod";
import { App, normalizePath } from "obsidian";

export type DownloadedPlugin = {
  id: string;
  name: string;
  description: string;
  isAlreadyInstalled: boolean;
  zip: AdmZip;
};

export class PluginManager {
  constructor(private plugin: Plugin) {}

  async downloadPlugin(downloadUrl: string): Promise<DownloadedPlugin> {
    const response = await fetch(downloadUrl, {
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

    return { ...manifest, isAlreadyInstalled, zip };
  }

  async installPlugin(downloadedPlugin: DownloadedPlugin) {
    const { id: pluginId, zip, isAlreadyInstalled } = downloadedPlugin;
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
