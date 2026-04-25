import { lintEnfyraTypeScript } from '~/utils/editor/enfyraTypeScriptLinter'

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

  it('accepts Enfyra macros before TypeScript checking', async () => {
    const diagnostics = await lintEnfyraTypeScript(`
const userId: string = @USER.id
const item = await #users.findOne({ filter: { id: userId } })
await @TRIGGER('flow_name', { item })
`)

    expect(diagnostics).toEqual([])
  })

  it('maps diagnostics after Enfyra macros back to source positions', async () => {
    const source = 'const body = @BODY\nconst value: string = 1'
    const diagnostics = await lintEnfyraTypeScript(source)
    const typeDiagnostic = diagnostics.find((diagnostic) => diagnostic.message.includes("Type 'number'"))

    expect(typeDiagnostic).toBeTruthy()
    expect(typeDiagnostic!.from).toBeGreaterThan(source.indexOf('@BODY'))
    expect(source.slice(typeDiagnostic!.from, typeDiagnostic!.to)).toBe('value')
  })
})
