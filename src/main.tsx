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
import {
  type DownloadedPlugin,
  type LinkParams,
  PluginManager,
} from "./plugin-manager";
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
      const params = plugin.pluginManager.safelyParseLinkParams(e);
      if (!params.success) {
        new Notice("Invalid URL (see logs)");
        console.error("Invalid Obsidian protocol data:", params.error);
        return;
      }

      plugin.openReactModal(
        <InstallationConfirmModal linkParams={params.data} />,
      );
    },
  );
}

const InstallationConfirmModal = ({
  linkParams,
}: {
  linkParams: LinkParams;
}) => {
  const plugin = usePlugin();
  const modal = useObsidianModal();

  const [downloadedPlugin, setDownloadedPlugin] =
    useState<DownloadedPlugin | null>(null);
  useEffect(() => {
    plugin.pluginManager
      .downloadPlugin(linkParams)
      .then(setDownloadedPlugin)
      .catch((error) => {
        new Notice("Failed to download plugin (see logs).");
        console.error("Error downloading plugin:", error);
        modal.close();
      });
  }, [linkParams]);

  if (downloadedPlugin === null) {
    return (
      <p>
        Downloading plugin from <code>{linkParams.download_url}</code>...
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
          <code>{linkParams.download_url}</code>
        </b>
      </p>
      <p>
        <b>Plugin Name:</b> {downloadedPlugin.name}
        <br />
        <b>Description:</b> {downloadedPlugin.description}
      </p>
      {downloadedPlugin.initialData && (
        <p>
          <b>Initial Data:</b>{" "}
          <code style={{ whiteSpaceCollapse: "preserve" }}>
            {JSON.stringify(downloadedPlugin.initialData)}
          </code>
        </p>
      )}
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
  const plugin = usePlugin();

  const [downloadUrl, setDownloadUrl] = useState("");
  const [initialDataStr, setInitialDataStr] = useState("");
  const initialData = (() => {
    try {
      return JSON.parse(initialDataStr);
    } catch {
      return null;
    }
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ fontWeight: "bold" }}>Generate a Plugdown link</div>
      <label>
        Prepare the ZIP file that contains the plugin you want to share. This
        ZIP file needs to contain the manifest.json file at the root level.
        Enter the download URL here:
      </label>
      <input
        type="text"
        placeholder="https://example.com/your-plugin.zip"
        value={downloadUrl}
        onChange={(e) => setDownloadUrl(e.target.value)}
      />
      <label>
        (Optional) Enter initial data as a JSON object, which will be inserted
        into the plugin's data.json file on installation.
      </label>
      <input
        type="text"
        placeholder="{}"
        value={initialDataStr}
        onChange={(e) => setInitialDataStr(e.target.value)}
        style={{ fontFamily: "monospace" }}
      />
      {initialDataStr.length > 0 && (
        <>
          {initialData === null && (
            <div style={{ color: "var(--color-red)" }}>Invalid JSON.</div>
          )}
          {initialData !== null && (
            <div style={{ opacity: 0.7 }}>
              Initial data:{" "}
              <code style={{ whiteSpaceCollapse: "preserve" }}>
                {JSON.stringify(initialData)}
              </code>
            </div>
          )}
        </>
      )}
      {downloadUrl.length > 0 && (
        <>
          <label>Copy your Plugdown install link from here:</label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>➡️</span>
            <input
              type="text"
              style={{ flex: 1 }}
              readOnly
              value={plugin.pluginManager.stringifyLinkParams(
                downloadUrl,
                initialData,
              )}
              onFocus={(e) => e.target.select()}
            />
          </div>
        </>
      )}
    </div>
  );
};
