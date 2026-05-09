import { Modal } from "obsidian";
import { createContext, StrictMode, useContext, type JSX } from "react";
import { type Root, createRoot } from "react-dom/client";
import type MyPlugin from "./main";

export const PluginContext = createContext<MyPlugin | null>(null);

export function usePlugin() {
  const plugin = useContext(PluginContext);
  if (!plugin) {
    throw new Error("usePlugin must be used within a PluginContext.Provider");
  }
  return plugin;
}

export const ObsidianModalContext = createContext<ReactModal | null>(null);

export function useObsidianModal() {
  const modal = useContext(ObsidianModalContext);
  if (!modal) {
    throw new Error(
      "useObsidianModal must be used within a ObsidianModalContext.Provider",
    );
  }
  return modal;
}

export class ReactModal extends Modal {
  root: Root | null = null;

  constructor(
    private plugin: MyPlugin,
    private content: JSX.Element,
  ) {
    super(plugin.app);
  }

  override onOpen() {
    this.root = createRoot(this.contentEl);
    this.root.render(
      <StrictMode>
        <PluginContext.Provider value={this.plugin}>
          <ObsidianModalContext.Provider value={this}>
            {this.content}
          </ObsidianModalContext.Provider>
        </PluginContext.Provider>
      </StrictMode>,
    );
  }

  override onClose(): void {
    this.root?.unmount();
  }
}
