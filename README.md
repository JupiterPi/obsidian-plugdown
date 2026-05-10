# Obsidian Plugdown

> [WARNING!]
> This plugin is in early development.

Quickly install Obsidian plugins from a (downloaded) zip file.

## Installation

Install Plugdown from source (you will figure it out).

## Distributing your plugin using Plugdown

Create a download endpoint that serves a zip file of your plugin. This might be GitHub releases, a custom server, or any file hosting service.

Then, create a Plugdown link that contains the download URL. You can do this using the built-in generator in the Plugdown settings. It will look something like this:
```obsidian://plugdown-install?download_url=http%3A%2F%2Fexample.com%2Fyour-obsidian-plugin.zip```

Obsidian users with Plugdown installed can now open this link, and Plugdown will handle downloading and installing the plugin into their Obsidian vault.