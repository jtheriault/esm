import assert from "assert"
import { a, b, c } from "../fixture/require/namespace.mjs"

export default () => {
  assert.deepStrictEqual([a, b, c], ["a", "b", "c"])
}
