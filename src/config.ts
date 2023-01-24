import { homedir } from 'node:os'
import * as fs from 'node:fs'

/**
 * CONFIG for the CLI
 */
const configBackend = {
    fileLoc: homedir() + '/terminai.json',
    cacheLoc: homedir() + '/terminai-cache.json',
    api: "https://raw.githubusercontent.com/Tronic247/terminai/main/package.json" + '?' + Math.random(),
    version: "1.1.2",
    prod: process.env.NODE_ENV === 'production',
}

/**
 * User defined config
 */
const defaultConfig: {
    shell: "bash" | "powershell" | "cmd",
    apiKey: string,
    useCache: boolean,
} = {
    shell: 'bash',
    apiKey: 'XXXXXXXXXXXXX',
    useCache: true,
}

/**
 * Gets the config from the config file, or creates a new one if it doesn't exist
 */
function getConfig(): typeof defaultConfig {
    if (!fs.existsSync(configBackend.fileLoc)) {
        fs.writeFileSync(configBackend.fileLoc, JSON.stringify(defaultConfig))

        return defaultConfig
    }

    try {
        return JSON.parse(fs.readFileSync(configBackend.fileLoc, 'utf-8'))
    } catch (error) {
        fs.writeFileSync(configBackend.fileLoc, JSON.stringify(defaultConfig))

        return defaultConfig
    }
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

/**
 * Get cache
 */
function getCache(): { [key: string]: string } {
    if (!fs.existsSync(configBackend.cacheLoc)) {
        fs.writeFileSync(configBackend.cacheLoc, JSON.stringify({}))

        return {}
    }

    try {
        return JSON.parse(fs.readFileSync(configBackend.cacheLoc, 'utf-8'))
    } catch (error) {
        fs.writeFileSync(configBackend.cacheLoc, JSON.stringify({}))

        return {}
    }
}

/**
 * Add to cache
 */
async function addToCache(key: {
    name: string,
    shell: "bash" | "powershell" | "cmd",
}, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const cache = getCache()

        cache[JSON.stringify(key)] = value

        fs.writeFile(configBackend.cacheLoc, JSON.stringify(cache), (err) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

/**
 * Remove from cache
 */
async function removeFromCache(key: {
    name: string,
    shell: "bash" | "powershell" | "cmd",
}): Promise<void> {
    return new Promise((resolve, reject) => {
        const cache = getCache() || {}

        delete cache[JSON.stringify(key)]

        fs.writeFile(configBackend.cacheLoc, JSON.stringify(cache), (err) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

export { setConfig, configBackend, getConfig, getCache, addToCache, removeFromCache }