import {
  type App,
  Notice,
  type ObsidianProtocolData,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import { BehaviorSubject } from "rxjs";
import z from "zod";
import { ReactModal, useObsidianModal, usePlugin } from "./react-wrappers";
import type { JSX } from "react/jsx-runtime";
import { PluginManager } from "./plugin-manager";

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

    this.addSettingTab(new MySettings(this.app, this));
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
          download_url: z.string(),
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

  return (
    <>
      <h2>Install Plugin via Plugdown</h2>
      <p>You are about to install a plugin from the following URL:</p>
      <p>
        <b>
          <code>{downloadUrl}</code>
        </b>
      </p>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button
          className="mod-cta" // use Obsidian's primary button style
          onClick={() => {
            plugin.pluginManager.installPluginFromUrl(downloadUrl);
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

class MySettings extends PluginSettingTab {
  plugin: MyPlugin;

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setDesc(
      "Here, you will be able to manage plugins installed through Plugdown.",
    );
    // todo
  }
}
