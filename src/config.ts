import { homedir } from 'node:os'
import * as fs from 'node:fs'







/**
 * CONFIG
 */
const configBackend = {
    fileLoc: homedir() + '/terminai.json',
    api: "https://terminai.tronic247.com/api",
    version: "1.0.3",
    prod: process.env.NODE_ENV === 'production',
}






const defaultConfig: {
    shell: "bash" | "powershell" | "cmd",
    apiKey: string,
} = {
    shell: 'bash',
    apiKey: 'XXXXXXXXXXXXX',
}

/**
 * Gets the config from the config file, or creates a new one if it doesn't exist
 */
function getConfig(): typeof defaultConfig {
    if (!fs.existsSync(configBackend.fileLoc)) {
        fs.writeFileSync(configBackend.fileLoc, JSON.stringify(defaultConfig))

        return defaultConfig
    }

    return JSON.parse(fs.readFileSync(configBackend.fileLoc, 'utf-8'))
}

/** 
 * Sets the config to the given config
 */
async function setConfig(config: typeof defaultConfig): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.writeFile(configBackend.fileLoc, JSON.stringify(config), (err) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

export { setConfig, configBackend, getConfig }