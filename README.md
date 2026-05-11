# Obsidian Plugdown

> [!WARNING]
> This plugin is in development and might not work correctly (I do use it though).

Quickly install Obsidian plugins from a link to a ZIP file.

## Installation

Install Plugdown from this repo's [releases](https://github.com/JupiterPi/obsidian-plugdown/releases).
You can do this using [BRAT](https://tfthacker.com/brat-quick-guide).

## Distributing your plugin using Plugdown

Create a download endpoint that serves a ZIP file of your plugin. This might be GitHub releases, a custom server, or any file hosting service.

Then, create a Plugdown link that contains the download URL. You can do this using the built-in generator in the Plugdown settings. It will look something like this:
```obsidian://plugdown-install?download_url=http%3A%2F%2Fexample.com%2Fyour-obsidian-plugin.zip```

Optionally, you can also set an initial data payload, which will be copied into the data.json file of the plugin. 

Obsidian users with Plugdown installed can now open this link, and Plugdown will handle downloading and installing the plugin into their Obsidian vault.

### Why?

Distributing beta versions of Obsidian plugins is annoying, especially when you want to iterate quickly. For local development, you need to set up a build step to copy the files into your vault, which can be hard (for my workflow, I wanted to be able to write code on a remote machine, so I even needed a system to copy files between devices). To distribute builds for testing, BRAT makes the job easier, but you still need to create a GitHub release for every change. With Plugdown, that's not required, and you can distribute a simple ZIP file in whatever way is best suited for your project. (In the case of my project [Tephra](https://github.com/JupiterPi/tephra), the plugin works together with a server, which now serves the plugin ZIP file and provides a convenient one-click download through Plugdown.)

### Limitations

Currently, Plugdown does not work on mobile devices (this is to be fixed).
