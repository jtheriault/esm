import { Parser as AcornParser } from "acorn/dist/acorn.es.js"
import extensions from "./acorn-extensions"

const defaultOptions = {
  allowReturnOutsideFunction: false,
  enableExportExtensions: false,
  enableImportExtensions: false,
  ecmaVersion: 9,
  sourceType: "module"
}

class Parser {
  static parse(code, options) {
    options = Object.assign(Object.create(null), defaultOptions, options)
    return extend(new AcornParser(options, code), options).parse()
  }
}

function extend(parser, options) {
  extensions.enableAwaitAnywhere(parser)
  extensions.enableDynamicImport(parser)
  extensions.enableTolerance(parser)

  if (options.enableExportExtensions) {
    extensions.enableExport(parser)
  }

  if (options.enableImportExtensions) {
    extensions.enableImport(parser)
  }

  return parser
}

Object.setPrototypeOf(Parser.prototype, null)

export default Parser
