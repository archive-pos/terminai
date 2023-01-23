import { getConfig, configBackend, setConfig, addToCache, getCache, removeFromCache } from "./config";
import { parseArgs } from "./utils";
import chalk from "chalk";
import fetch from 'node-fetch';
import prompts from "prompts";
import { Configuration, OpenAIApi } from "openai";
import open from "open";

//@ts-ignore
const clipboardy = (...args: any) => import('clipboardy').then(({ default: clipboardy }) => clipboardy.writeSync(...args));

const say = (text: string) => console.log(text.replace(/<c>(.*?)<\/c>/g, chalk.cyan("$1")) // Cyan
    .replace(/<g>(.*?)<\/g>/g, chalk.green("$1")) // Green
    .replace(/<b>(.*?)<\/b>/g, chalk.blue("$1")) // Blue 
    .replace(/<y>(.*?)<\/y>/g, chalk.yellow("$1")) // Yellow
    .replace(/<m>(.*?)<\/m>/g, chalk.magenta("$1")) // Magenta
);

const encode = (text: string) => text.split("").map(c => String.fromCharCode(c.charCodeAt(0) + 1)).reverse().map(c => String.fromCharCode(c.charCodeAt(0) + 1)).join("");
const decode = (text: string) => text.split("").map(c => String.fromCharCode(c.charCodeAt(0) - 1)).reverse().map(c => String.fromCharCode(c.charCodeAt(0) - 1)).join("");

/**
 * Command functions
 */
/**
 * Help screen
 */
function home() {
    let updateProgress = 0;
    let fetched = false;
    const frames = "▁ ▂ ▃ ▄ ▅ ▆ ▇ █ ▇ ▆ ▅ ▄ ▃ ▁".split(" ");
    let updateInterval = setInterval(() => {
        if (fetched) {
            clearInterval(updateInterval);
            return;
        }

        process.stdout.write(`\r${chalk.yellow("Checking for updates...")} ${frames[updateProgress]}`);
        updateProgress = (updateProgress + 1) % frames.length;
    }, 100);

    let help = `
<c>Terminai</c>              Generate CLI commands with AI
Created by <g>@posandu</g>   <b>https://terminai.tronic247.com</b>

<y>Version:</y> <g>${configBackend.version}</g> | <m>Support https://bit.ly/3t1NZxX</m>

<y>Usage:</y> <g>terminai</g> <b>[command]</b> <g>[args]</g>

<y>Commands:</y> <g>help</g> <b>- Show this help message</b>
          <g>config</g> <b>- Configure the CLI</b>
          <g>"(a string)"</g> <b>- Generate a command from the string</b>
                     <y>args:</y> <b>--r</b> <g>- Rewrite cache</g>
          <g>opConfig</g> <b>- Open the config file (Edit with caution)</b>
          <g>opCache</g> <b>- Open the cache file (Edit with caution)</b>

${getConfig().apiKey.trim() === "" ? chalk.red("No API key found. Run 'terminai config' to configure the CLI.") : chalk.green("API key found. You're good to go! Make sure it's valid.")}
`

    fetch(configBackend.api).then(res => res.json()).then(data => {
        if (((data as any)?.version !== configBackend.version)) {
            process.stdout.write("\r" + chalk.bgRed(chalk.black("New version released! Please update 🙂")) + " ".repeat(20) + "\r");
        } else {
            process.stdout.write("\r" + chalk.gray("You're updated. Go generate some commands now.") + " ".repeat(20) + "\r");
        }
    }).catch(err => {
        process.stdout.write("\r" + chalk.gray("You're updated. Go generate some commands now.") + " ".repeat(20) + "\r");
    }).finally(() => {
        fetched = true;
        clearInterval(updateInterval);
    })


    say(help);
}

/**
 * Configuration screen
 */
function config() {
    say(chalk.yellow("Terminai Configuration"));

    (async () => {
        let apikey = await prompts({
            type: "password",
            name: "value",
            message: "API Key",
            initial: decode(getConfig().apiKey),
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

        let useCache = await prompts({
            type: "toggle",
            name: "value",
            message: "Use cache?",
            initial: getConfig().useCache,
            active: "yes",
            inactive: "no"
        })

        if (apikey.value.trim() === "") {
            console.log(chalk.yellow("API key is empty. Reverting to default."))
            apikey.value = getConfig().apiKey
        }

        setConfig({
            apiKey: encode(apikey.value),
            shell: shell.Shell,
            useCache: useCache.value
        })
    })()
}

/**
 * Generate command
 */
function generate() {
    say(chalk.yellow("Generating command... Hang tight!"));

    const prompt = parseArgs()[0].trim();
    const rewriteCache = parseArgs().includes("--r");

    if (!prompt.trim()) {
        say(chalk.red("No prompt provided!"));
        return;
    }

    if (rewriteCache && !getConfig().useCache) {
        say(chalk.bgYellowBright(chalk.black("Cache is disabled! No need to rewrite cache.")));
    } else if (rewriteCache && getConfig().useCache) {
        say(chalk.bgYellowBright(chalk.black("Rewriting cache...")));
    }

    const showCode = (code: string) => {
        say(chalk.green("Generated command:"));
        say(code);
        clipboardy(code);
        say(chalk.blue("Copied to clipboard!"));
    }

    if (rewriteCache) {
        removeFromCache({
            name: prompt,
            shell: getConfig().shell
        })
    }

    if (getCache()[JSON.stringify({
        name: prompt,
        shell: getConfig().shell
    })] && getConfig().useCache) {
        showCode(getCache()[prompt]);
        return;
    }

    (async () => {
        try {
            const configuration = new Configuration({
                apiKey: decode(getConfig().apiKey),
            });

            const openai = new OpenAIApi(configuration);

            const response = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: `generate the one-liner ${getConfig().shell} command for the given JSON prompt\nprompt:"${JSON.stringify(prompt)}"\ncommand:`,
                temperature: 0.7,
                max_tokens: 256,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            });

            const val = response.data.choices[0].text;

            if (val.trim()) {
                showCode(val);

                if (getConfig().useCache) addToCache({
                    name: prompt,
                    shell: getConfig().shell,
                }, val);
            }
        } catch (error) {
            say(chalk.red(error) + " " + "Make sure your API key is valid. Run 'terminai config' to configure the CLI.")
        }
    })()
}

/**
 * Open config file
 */
function opConfig() {
    say(chalk.yellow("Opening config file..."));
    open(configBackend.fileLoc);
}

/**
 * Open cache file
 */
function opCache() {
    say(chalk.yellow("Opening cache file..."));
    open(configBackend.cacheLoc);
}

/**
 * Command handler
 */
if (parseArgs().length === 0 || parseArgs()[0] === "help") home();
else if (parseArgs()[0] === "config") config();
else if (parseArgs()[0] === "opConfig") opConfig();
else if (parseArgs()[0] === "opCache") opCache();
else generate();