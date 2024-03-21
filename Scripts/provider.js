const utils = require("./utils");

const categorySeverity = {  // TODO: move to Nova config maybe?
    "E": "Error",
    "F": "Error",
    "W": "Warning"
}

class IssueProvider {
    constructor(config) {
        this.config = config;
        this.issueCollection = new IssueCollection("flake8");
        this.parser = new IssueParser("flake8");
    }

    getProcessOptions() {
        const defaultOptions = [
            "--format=%(row)d:%(col)d %(code)s %(text)s",
            "-"
        ];
        const commandArguments = this.config.commandArguments();
        const extraOptions = utils.normalizeOptions(commandArguments);

        return Array.from(new Set([...extraOptions, ...defaultOptions]));
    }

    getProcess() {
        const executablePath = nova.path.expanduser(this.config.executablePath());

        if (!nova.fs.stat(executablePath)) {
            console.error(`Executable ${executablePath} does not exist`);
            return;
        }

        const options = this.getProcessOptions();

        return new Process(
            executablePath,
            {
                args: options,
                stdio: "pipe",
                cwd: nova.workspace.path,  // NOTE: must be explicitly set
            }
        );
    }

    provideIssues(editor) {
        return new Promise((resolve, reject) => this.check(editor, resolve, reject));
    }

    check(editor, resolve = null, reject = null) {
        if (editor.document.isEmpty) {
            if (reject) reject("empty file");
            return;
        }

        const textRange = new Range(0, editor.document.length);
        const content = editor.document.getTextInRange(textRange);
        const filePath = nova.workspace.relativizePath(editor.document.path);

        const process = this.getProcess();

        if (!process) {
            if (reject) reject("no process");
            return;
        }

        process.onStdout((output) => this.parser.pushLine(output));
        process.onStderr((error) => console.error(error));
        process.onDidExit((status) => {
            console.info(`Checking ${filePath}`);

            for (let issue of this.parser.issues) {
                let severity = categorySeverity[issue.code[0]];

                if (severity) {
                    issue.severity = IssueSeverity[severity];
                }

                // NOTE: Nova version 1.2 and prior has a known bug
                if (nova.version[0] === 1 && nova.version[1] <= 2) {
                    issue.line += 1;
                    issue.column += 1;
                }
            }

            console.info(`Found ${this.parser.issues.length} issue(s)"`);

            this.issueCollection.set(editor.document.uri, this.parser.issues);
            this.parser.clear();

            // HACK: nova.assistants.registerIssueAssistant uses its own private and
            // nameless IssueCollection, and that leads to issue duplication between
            // the command and on-save check. So, we give it nothing, and keep using
            // our explicit IssueCollection.
            if (resolve) resolve();
        });

        console.info(`Running ${process.command} ${process.args.join(" ")}`);

        process.start();

        const writer = process.stdin.getWriter();

        writer.ready.then(() => {
            writer.write(content);
            writer.close();
        });
    }
}

module.exports = IssueProvider;
