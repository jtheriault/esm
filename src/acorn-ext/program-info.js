import NullObject from "../null-object.js"

import getNamesFromPattern from "../parse/get-names-from-pattern.js"
import { types as tt } from "../vendor/acorn/src/tokentype.js"

function enable(parser) {
  parser.parseTopLevel = parseTopLevel
  return parser
}

function parseTopLevel(node) {
  if (! node.body) {
    node.body = []
  }

  const { body } = node
  const exported = new NullObject
  const idents = []
  const info = new NullObject

  let hoistedPrefixString = ""
  let inited = false
  let insertCharIndex = node.start
  let insertNodeIndex = 0

  while (this.type !== tt.eof) {
    const stmt = this.parseStatement(true, true, exported)
    let { expression, type } = stmt

    if (! inited) {
      // Avoid hoisting above string literal expression statements such as
      // "use strict", which may depend on occurring at the beginning of
      // their enclosing scopes.
      if (type === "ExpressionStatement" &&
          expression.type === "Literal" &&
          typeof expression.value === "string") {
        insertCharIndex = stmt.end
        insertNodeIndex = body.length + 1
        hoistedPrefixString = ";"
      } else {
        inited = true
      }
    }

    let object = stmt

    if (type === "ExportNameDeclaration") {
      object = stmt.declaration
      type = object.type
    }

    if (type === "VariableDeclaration") {
      for (const decl of object.declarations) {
        const names = getNamesFromPattern(decl.id)

        for (const name of names) {
          idents.push(name)
        }
      }
    } else if (type === "ClassDeclaration" ||
        type === "FunctionDeclaration") {
      idents.push(stmt.id.name)
    } else if (type === "ImportDeclaration") {
      for (const specifier of stmt.specifiers) {
        idents.push(specifier.local.name)
      }
    }

    body.push(stmt)
  }

  info.idents = idents
  info.insertCharIndex = insertCharIndex
  info.insertNodeIndex = insertNodeIndex
  info.hoistedExportsMap = new NullObject
  info.hoistedExportsString = ""
  info.hoistedImportsString = ""
  info.hoistedPrefixString = hoistedPrefixString

  this.next()
  node.info = info
  node.sourceType = this.options.sourceType
  return this.finishNode(node, "Program")
}

export { enable }
