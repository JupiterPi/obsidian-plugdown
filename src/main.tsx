import { Notice, type ObsidianProtocolData, Plugin } from "obsidian";
import { BehaviorSubject } from "rxjs";
import z from "zod";
import {
  ReactModal,
  ReactSettingsTab,
  useObsidianModal,
  usePlugin,
} from "./react-wrappers";
import type { JSX } from "react/jsx-runtime";
import { type DownloadedPlugin, PluginManager } from "./plugin-manager";
import { useEffect, useState } from "react";

const PluginSettings = z.object({});
type PluginSettings = z.infer<typeof PluginSettings>;

export default class MyPlugin extends Plugin {
  settings$ = new BehaviorSubject<PluginSettings>(PluginSettings.parse({}));

  pluginManager: PluginManager = new PluginManager(this);

  override async onload() {
    // setup read/write of settings
    this.loadData().then((data) => {
      this.settings$.next(PluginSettings.parse(data));
    });
    this.settings$.subscribe((settings) => {
      this.saveData(settings);
    });

    this.addSettingTab(new ReactSettingsTab(this, <SettingsTab />));

    registerObsidianProtocolHandler(this);
  }

  openReactModal(content: JSX.Element) {
    new ReactModal(this, content).open();
  }
}

// handler for obsidian://plugdown?download_url=... links

function registerObsidianProtocolHandler(plugin: MyPlugin) {
  plugin.registerObsidianProtocolHandler(
    "plugdown-install",
    async (e: ObsidianProtocolData) => {
      // safely parse params
      const params = z
        .object({
          download_url: z.string().transform((str) => decodeURIComponent(str)),
        })
        .safeParse(e as unknown);
      if (!params.success) {
        new Notice("Invalid URL (see logs)");
        console.error("Invalid Obsidian protocol data:", params.error);
        return;
      }
      const downloadUrl = params.data.download_url;

      plugin.openReactModal(
        <InstallationConfirmModal downloadUrl={downloadUrl} />,
      );
    },
  );
}

const InstallationConfirmModal = ({ downloadUrl }: { downloadUrl: string }) => {
  const plugin = usePlugin();
  const modal = useObsidianModal();

  const [downloadedPlugin, setDownloadedPlugin] =
    useState<DownloadedPlugin | null>(null);
  useEffect(() => {
    plugin.pluginManager
      .downloadPlugin(downloadUrl)
      .then(setDownloadedPlugin)
      .catch((error) => {
        new Notice("Failed to download plugin (see logs).");
        console.error("Error downloading plugin:", error);
        modal.close();
      });
  }, [downloadUrl]);

  if (downloadedPlugin === null) {
    return (
      <p>
        Downloading plugin from <code>{downloadUrl}</code>...
      </p>
    );
  }

  return (
    <>
      <h2>Install Plugin via Plugdown</h2>
      <p>
        You are about to install a plugin from the following URL:
        <br />
        <b>
          <code>{downloadUrl}</code>
        </b>
      </p>
      <p>
        <b>Plugin Name:</b> {downloadedPlugin.name}
        <br />
        <b>Description:</b> {downloadedPlugin.description}
      </p>
      {downloadedPlugin.isAlreadyInstalled && (
        <p style={{ color: "var(--color-orange)" }}>
          A plugin with the same ID is already installed and will be
          overwritten.
        </p>
      )}
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button
          className="mod-cta" // use Obsidian's primary button style
          onClick={() => {
            try {
              plugin.pluginManager.installPlugin(downloadedPlugin);
            } catch (error) {
              new Notice("Failed to install plugin (see logs).");
              console.error("Error installing plugin:", error);
            }
            modal.close();
          }}
        >
          Yes, install plugin
        </button>
        <button onClick={() => modal.close()}>Cancel</button>
      </div>
    </>
  );
};

// settings tab

const SettingsTab = () => {
  const [downloadUrl, setDownloadUrl] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ fontWeight: "bold" }}>Generate a Plugdown link</div>
      Enter the download URL to the ZIP file that contains the plugin you want
      to share. This ZIP file needs to contain the manifest.json file at the
      root level.
      <input
        type="text"
        style={{ flex: 1 }}
        placeholder="https://example.com/your-plugin.zip"
        value={downloadUrl}
        onChange={(e) => setDownloadUrl(e.target.value)}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>➡️</span>
        <input
          type="text"
          style={{ flex: 1 }}
          readOnly
          value={`obsidian://plugdown-install?download_url=${encodeURIComponent(downloadUrl)}`}
          onFocus={(e) => e.target.select()}
        />
      </div>
    </div>
  );
};
