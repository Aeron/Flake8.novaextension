const Config = require("./config");
const IssueProvider = require("./provider");

exports.activate = function () {
    const issueProvider = new IssueProvider(Config);

    console.info(`Executable path: ${Config.executablePath()}`);
    console.info(`Command arguments: ${Config.commandArguments()}`);
    console.info(`Check mode: ${Config.checkMode()}`);

    var assistant = null;

    for (c of [nova.config, nova.workspace.config]) {
        c.observe("cc.aeron.nova-flake8.checkMode", () => {
            if (assistant) {
                assistant.dispose();
                assistant = null;
            }

            const checkMode = Config.checkMode();

            if (checkMode !== "-") {
                assistant = nova.assistants.registerIssueAssistant(
                    "python", issueProvider, { "event": checkMode }
                );
            }
        });
    }

    nova.commands.register("checkWithFlake8", (editor) => {
        issueProvider.check(editor);
    });
}
