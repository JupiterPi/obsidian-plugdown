import { Notice } from "obsidian";
import type Plugin from "./main";

export class PluginManager {
  constructor(private plugin: Plugin) {}

  installPluginFromUrl(downloadUrl: string) {
    new Notice("Plugin installation is not implemented yet."); // todo
  }
}
