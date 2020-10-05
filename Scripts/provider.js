const categorySeverity = {  // TODO: move to Nova config maybe?
    "E": "Error",
    "F": "Error",
    "W": "Warning"
}

class IssuesProvider {
    constructor(config) {
        this.config = config;
    }

    async getProcess() {
        const executablePath = this.config.get("executablePath");
        const commandArguments = this.config.get("commandArguments");
        const defaultOptions = [
            "--format=%(row)d:%(col)d %(code)s %(text)s",
            "-"
        ];

        var options = [];

        if (commandArguments) {
            options = commandArguments
                .replaceAll("\n", " ")
                .split(" ")
                .map((option) => option.trim())
                .filter((option) => option !== " ");
        }

        options = [...options, ...defaultOptions].filter((option) => option !== "");

        return new Process(
            executablePath,
            {
                args: Array.from(new Set(options)),
                stdio: "pipe",
                cwd: nova.workspace.path,  // NOTE: must be explicitly set
            }
        );
    }

    async provideIssues(editor) {
        return new Promise((resolve, reject) => this.check(editor, resolve));
    }

    async check(editor, resolve) {
        if (editor.document.isEmpty) return;

        const textRange = new Range(0, editor.document.length);
        const content = editor.document.getTextInRange(textRange);
        const filePath = nova.workspace.relativizePath(editor.document.path);

        let parser = new IssueParser("flake8");

        const process = await this.getProcess();

        if (!process) return;

        process.onStdout((output) => parser.pushLine(output));
        process.onStderr((error) => console.error(error));
        process.onDidExit((status) => {
            console.log("Checking " + filePath);

            for (let issue of parser.issues) {
                let severity = categorySeverity[issue.code[0]];

                if (severity) {
                    issue.severity = IssueSeverity[severity];
                }

                // HACK: looks like it's a bug (probably known)
                issue.line += 1;
                issue.column += 1;
            }

            console.log("Found " + parser.issues.length + " issue(s)");

            resolve(parser.issues);
            parser.clear();
        });

        console.log("Running " + process.command + " " + process.args.join(" "));

        process.start();

        const writer = process.stdin.getWriter();

        writer.ready.then(() => {
            writer.write(content);
            writer.close();
        });
    }
}

module.exports = IssuesProvider;
