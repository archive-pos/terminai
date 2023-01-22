import { getConfig, configBackend, setConfig } from "./config";
import { parseArgs } from "./utils";
import chalk from "chalk";
import fetch from 'node-fetch';
import prompts from "prompts";
import { Configuration, OpenAIApi } from "openai";

//@ts-ignore
const clipboardy = (...args: any) => import('clipboardy').then(({ default: clipboardy }) => clipboardy.writeSync(...args));

const say = (text: string) => {
    console.log("      " + text.split("\n").join("\n      "))
}

let help = `
      ${chalk.cyan("Terminai")} - Generate CLI commands with AI
      Created by ${chalk.green("@posandu")} - ${chalk.blue("https://terminai.tronic247.com")}

      ${chalk.yellow("Version:")} ${chalk.green(configBackend.version)}
      ${chalk.magenta("Support https://bit.ly/3t1NZxX")}

      ${chalk.yellow("Usage:")} 
      ${chalk.green("terminai")} ${chalk.blue("[command]")}

      ${chalk.yellow("Commands:")}
      ${chalk.green("help")} ${chalk.gray("- Show this help message")}
      ${chalk.green("config")} ${chalk.gray("- Configure the CLI")}
      ${chalk.green("\"(a string)\"")} ${chalk.gray("- Generate a command from the string")}

      ${getConfig().apiKey.trim() === "" ? chalk.red("     No API key found. Run 'terminai config' to configure the CLI.") : chalk.green("API key found. You're good to go! Make sure it's valid.")}
`

fetch(configBackend.api).then(res => res.json()).then(data => {
    if (((data as any)?.version !== configBackend.version)) {
        console.log(chalk.red("      New version available! Run 'npm i -g terminai' to update!"))
    }
}).catch(err => { 
    // Silently fail
})

if (parseArgs().length === 0 || parseArgs()[0] === "help") {
    console.log(help)
}

else if (parseArgs()[0] === "config") {
    say(chalk.yellow("Terminai Configuration"));

    (async () => {
        let apikey = await prompts({
            type: "text",
            name: "value",
            message: "API Key",
            initial: getConfig().apiKey,
            mask: "*",
        })

        let shell = await prompts({
            type: "select",
            choices: [
                { title: "Bash", value: "bash" },
                { title: "PowerShell", value: "powershell" },
                { title: "CMD", value: "cmd" },
            ],
            name: "Shell",
            message: "Shell",
            initial: getConfig().shell === "bash" ? 0 : getConfig().shell === "powershell" ? 1 : 2
        })

        if (apikey.value.trim() === "") {
            console.log(chalk.yellow("API key is empty. Reverting to default."))
            apikey.value = getConfig().apiKey
        }

        setConfig({
            apiKey: apikey.value,
            shell: shell.Shell
        })
    })()
}

else {
    say(chalk.yellow("Generating command... Hang tight!"));

    (async () => {
        try {
            const configuration = new Configuration({
                apiKey: getConfig().apiKey,
            });

            const openai = new OpenAIApi(configuration);

            const response = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: `generate the one-liner ${getConfig().shell} command for the given JSON prompt\nprompt:"${JSON.stringify(parseArgs()[0])}"\ncommand:`,
                temperature: 0.7,
                max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            });

            const val = response.data.choices[0].text;

            if (val.trim()) {
                say(chalk.green("Generated command:"));
                say(val);
                clipboardy(val);
                say(chalk.blue("Copied to clipboard!"));
            }
        } catch (error) {
            say(chalk.red(error))
        }
    })()
}

