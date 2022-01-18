import { resolve } from 'path'
import { loadConfig, getCwd, StringToStream, mergeStream2 } from 'ssr-server-utils'
import { renderToNodeStream, renderToString } from '@vue/server-renderer'
import { ISSRContext, UserConfig, ExpressContext, IConfig } from 'ssr-types'
import type { ViteDevServer } from 'vite'

const cwd = getCwd()
const defaultConfig = loadConfig()

function render (ctx: ISSRContext, options?: UserConfig): Promise<string>
function render<T> (ctx: ISSRContext, options?: UserConfig): Promise<T>

async function render (ctx: ISSRContext, options?: UserConfig) {
  const config = Object.assign({}, defaultConfig, options ?? {})
  const { stream, isVite } = config

  if (!ctx.response.type && typeof ctx.response.type !== 'function') {
    ctx.response.type = 'text/html;charset=utf-8'
  } else if (!(ctx as ExpressContext).response.hasHeader?.('content-type')) {
    (ctx as ExpressContext).response.setHeader?.('Content-type', 'text/html;charset=utf-8')
  }

  const serverRes = isVite ? await viteRender(ctx, config) : await commonRender(ctx, config)
  if (stream) {
    const stream = mergeStream2(new StringToStream('<!DOCTYPE html>'), renderToNodeStream(serverRes))
    stream.on('error', (e: any) => {
      console.log(e)
    })
    return stream
  } else {
    const ctx: {
      teleports?: Record<string, string>
    } = {}
    let html = await renderToString(serverRes, ctx)
    if (ctx.teleports) {
      const cheerio = require('cheerio')
      const $ = cheerio.load(html)
      for (const target in ctx.teleports) {
        const content = ctx.teleports[target]
        $(target).append(content)
      }
      html = $.html()
    }
    return `<!DOCTYPE html>${html}`
  }
}

let viteServer: ViteDevServer|boolean = false
async function viteRender (ctx: ISSRContext, config: IConfig) {
  const { isDev, chunkName, vue3ServerEntry } = config
  let serverRes
  if (isDev) {
    const { createServer } = await import('vite')
    const { serverConfig } = await import('ssr-plugin-vue3')
    viteServer = !viteServer ? await createServer(serverConfig) : viteServer
    const { serverRender } = await (viteServer as ViteDevServer).ssrLoadModule(vue3ServerEntry)
    serverRes = await serverRender(ctx, config)
  } else {
    const serverFile = resolve(cwd, `./build/server/${chunkName}.server.js`)
    const { serverRender } = require(serverFile)
    const serverRes = await serverRender(ctx, config)
    return serverRes
  }
  return serverRes
}

async function commonRender (ctx: ISSRContext, config: IConfig) {
  const { isDev, chunkName } = config
  const serverFile = resolve(cwd, `./build/server/${chunkName}.server.js`)

  if (isDev) {
    delete require.cache[serverFile]
  }

  const { serverRender } = require(serverFile)
  const serverRes = await serverRender(ctx, config)
  return serverRes
}

export { render }
