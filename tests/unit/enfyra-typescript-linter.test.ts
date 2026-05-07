import {
  lintEnfyraScript,
  lintEnfyraTypeScript,
  lintVueSfcScripts,
  validateEnfyraRequiredReturnScript,
} from '~/utils/editor/enfyraTypeScriptLinter'

describe('lintEnfyraTypeScript', () => {
  it('reports TypeScript type errors', async () => {
    const diagnostics = await lintEnfyraTypeScript('const value: string = 1')

    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("Type 'number' is not assignable to type 'string'"))).toBe(true)
  })

  it('reports unresolved identifiers from route handler code', async () => {
    const source = `a = b
return {
  foo: "baz"
}`
    const diagnostics = await lintEnfyraTypeScript(source)

    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("Cannot find name 'a'"))).toBe(true)
    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("Cannot find name 'b'"))).toBe(true)
  })

  it('reports unresolved identifiers in strict JavaScript mode', async () => {
    const diagnostics = await lintEnfyraScript('a = b', 'javascript')

    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("Cannot find name 'a'"))).toBe(true)
    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("Cannot find name 'b'"))).toBe(true)
  })

  it('rejects TypeScript syntax in JavaScript mode', async () => {
    const diagnostics = await lintEnfyraScript('const value: string = "ok"', 'javascript')

    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("Type annotations can only be used in TypeScript files"))).toBe(true)
  })

  it('accepts Enfyra macros before TypeScript checking', async () => {
    const diagnostics = await lintEnfyraTypeScript(`
const userId: string = @USER.id
const item = await #users.findOne({ filter: { id: userId } })
await @TRIGGER('flow_name', { item })
`)

    expect(diagnostics).toEqual([])
  })

  it('accepts DynamicRepository exists with a direct filter', async () => {
    const diagnostics = await lintEnfyraTypeScript(`
const used = await @REPOS.user_definition.exists({ email: { _eq: @BODY.email } })
if (used) @THROW409('user_definition', 'email', @BODY.email)
return { used }
`)

    expect(diagnostics).toEqual([])
  })

  it('accepts common Object static methods in admin scripts', async () => {
    const diagnostics = await lintEnfyraTypeScript(`
const incomingFilter = @QUERY.filter ?? {}
const scopeFilter = { owner_id: { _eq: @USER.id } }
@QUERY.filter = Object.keys(incomingFilter).length
  ? { _and: [incomingFilter, scopeFilter] }
  : scopeFilter
const values = Object.values(@BODY)
const entries = Object.entries(@PARAMS)
return { values, entries }
`)

    expect(diagnostics).toEqual([])
  })

  it('rejects stale DynamicRepository where option', async () => {
    const diagnostics = await lintEnfyraTypeScript(`
return await @REPOS.user_definition.find({ where: { email: { _eq: @BODY.email } } })
`)

    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("'where'"))).toBe(true)
  })

  it('maps diagnostics after Enfyra macros back to source positions', async () => {
    const source = 'const body = @BODY\nconst value: string = 1'
    const diagnostics = await lintEnfyraTypeScript(source)
    const typeDiagnostic = diagnostics.find((diagnostic) => diagnostic.message.includes("Type 'number'"))

    expect(typeDiagnostic).toBeTruthy()
    expect(typeDiagnostic!.from).toBeGreaterThan(source.indexOf('@BODY'))
    expect(source.slice(typeDiagnostic!.from, typeDiagnostic!.to)).toBe('value')
  })

  it('checks Vue script tags as strict JavaScript by default', async () => {
    const source = `<template><div /></template>
<script>
a = b
</script>`
    const diagnostics = await lintVueSfcScripts(source)

    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("Cannot find name 'a'"))).toBe(true)
    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("Cannot find name 'b'"))).toBe(true)
  })

  it('rejects TypeScript syntax in Vue script tags without lang ts', async () => {
    const source = `<script>
const value: string = "ok"
</script>`
    const diagnostics = await lintVueSfcScripts(source)

    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("Type annotations can only be used in TypeScript files"))).toBe(true)
  })

  it('checks Vue script lang ts as TypeScript', async () => {
    const source = `<script setup lang="ts">
const value: string = 1
</script>`
    const diagnostics = await lintVueSfcScripts(source)

    expect(diagnostics.some((diagnostic) => diagnostic.message.includes("Type 'number' is not assignable to type 'string'"))).toBe(true)
  })

  it('accepts common Vue imports in script lang ts', async () => {
    const source = `<script setup lang="ts">
import { ref } from 'vue'
const value = ref<number>(1)
</script>`
    const diagnostics = await lintVueSfcScripts(source)

    expect(diagnostics).toEqual([])
  })

  it('accepts Enfyra extension runtime globals in Vue script lang ts', async () => {
    const source = `<script setup lang="ts">
const { data, execute } = useApi(() => "/users", {
  method: "post",
})
const { me } = useAuth()
const pageHeader = usePageHeaderRegistry()
const loaded = await getPackages(["lodash"])
await navigateTo("/settings")
console.log(data, execute, me, pageHeader, loaded, packages)
</script>`
    const diagnostics = await lintVueSfcScripts(source)

    expect(diagnostics).toEqual([])
  })
})

describe('validateEnfyraRequiredReturnScript', () => {
  it('rejects handler scripts without a return value', async () => {
    const result = await validateEnfyraRequiredReturnScript('const value = @BODY.id')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('Script must return a value')
    }
  })

  it('rejects bare return statements', async () => {
    const result = await validateEnfyraRequiredReturnScript('return')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('Script must return a value')
    }
  })

  it('accepts handler scripts that return a value', async () => {
    const result = await validateEnfyraRequiredReturnScript('return { data: @BODY }')

    expect(result.ok).toBe(true)
  })
})
