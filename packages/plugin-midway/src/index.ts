
import { start } from './start'
import { build } from './build'
import { deploy } from './deploy'

export function midwayPlugin () {
  return {
    name: 'plugin-midway',
    start,
    build,
    deploy
  }
}
