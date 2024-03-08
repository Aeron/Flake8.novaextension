# Flake8 Nova Extension

It’s a stand-alone [Nova][nova] extension to use [Flake8][flake8], a tool to check the
style and quality of Python code.

[nova]: https://nova.app
[flake8]: https://gitlab.com/pycqa/flake8

## Requirements

Before using the extension, it’s necessary to install Flake8 itself if you don’t
have one already.

Flake8 can be installed simply by running `pip install flake8`.

## Configuration

The extension supports both global and workspace configurations.
A workspace configuration always overrides a global one.

### Options

There are three options available to configure: executable path, command arguments,
and check mode. By default, the executable path is `/usr/local/bin/flake8`, with
no additional arguments, and checking on changing.

You could alter the executable path if Flake8 installed in a different place
or if `/usr/bin/env` usage is desirable.

In the case of `/usr/bin/env`, it becomes the executable path, and `flake8` becomes
the first argument.

### .flake8

The extension respects `.flake8` in a project directory. So, there’s no need to
specify the `--config` argument explicitly.
