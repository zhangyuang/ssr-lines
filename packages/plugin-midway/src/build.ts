import { exec } from 'child_process'
import { Argv } from 'ssr-types'

const build = (argv: Argv) => {
  const { cli } = require('@midwayjs/cli/bin/cli')
  exec('npx cross-env ets', async (err, stdout) => {
    if (err) {
      console.log(err)
      return
    }
    console.log(stdout)
    // 透传参数给 midway-bin
    argv.c = true
    await cli(argv)
  })
}

export {
  build
}
