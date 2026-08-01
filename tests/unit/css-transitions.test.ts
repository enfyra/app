import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join, relative, sep } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { ElementTypes, NodeTypes, type RootNode, type TemplateChildNode } from '@vue/compiler-core'

const cssDir = join(dirname(fileURLToPath(import.meta.url)), '../../app/assets/css')
const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readCss(name: string) {
  return readFileSync(join(cssDir, name), 'utf8')
}

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

function getVueFiles(directory: string): Array<{ file: string; content: string }> {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name)
    if (entry.isDirectory()) return getVueFiles(file)
    if (!entry.name.endsWith('.vue')) return []
    return [{ file, content: readFileSync(file, 'utf8') }]
  })
}

function getAllVueFiles() {
  return [join(appDir, 'components'), join(appDir, 'pages')].flatMap((directory) => getVueFiles(directory))
}

function getMeaningfulNodes(children: TemplateChildNode[]) {
  return children.filter((node) =>
    node.type !== NodeTypes.COMMENT
    && !(node.type === NodeTypes.TEXT && !node.content.trim()),
  )
}

function getBranchType(node: TemplateChildNode) {
  if (node.type !== NodeTypes.ELEMENT) return null

  return node.props.find((prop) =>
    prop.type === NodeTypes.DIRECTIVE
    && ['if', 'else-if', 'else'].includes(prop.name),
  )?.name ?? null
}

function getRootGroupsFromChildren(children: TemplateChildNode[]): TemplateChildNode[][] {
  const nodes = getMeaningfulNodes(children)
  const groups: TemplateChildNode[][] = []

  for (let index = 0; index < nodes.length; index += 1) {
    const group = [nodes[index]]
    if (getBranchType(nodes[index]) === 'if') {
      while (
        index + 1 < nodes.length
        && ['else-if', 'else'].includes(getBranchType(nodes[index + 1]) ?? '')
      ) {
        group.push(nodes[index + 1])
        index += 1
      }
    }
    groups.push(group)
  }

  return groups
}

function getRootGroups(root?: RootNode) {
  return getRootGroupsFromChildren(root?.children ?? [])
}

const componentDir = join(appDir, 'components')
const pageDir = join(appDir, 'pages')
const componentFiles = getVueFiles(componentDir)
const pageFiles = getVueFiles(pageDir)

function toPascalCase(value: string) {
  return value
    .split(/[-_]/)
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : '')
    .join('')
}

function getAutoImportName(file: string) {
  return relative(componentDir, file)
    .slice(0, -extname(file).length)
    .split(sep)
    .map(toPascalCase)
    .join('')
}

const componentByName = new Map(componentFiles.map((component) => [getAutoImportName(component.file), component]))

function hasTransitionableRoot(file: string, content: string, seen = new Set<string>()): boolean {
  if (seen.has(file)) return true
  seen.add(file)

  const root = parse(content, { filename: file }).descriptor.template?.ast
  const groups = getRootGroups(root)
  if (groups.length !== 1) return false

  const group = groups[0]
  if (getBranchType(group[0]) === 'if' && getBranchType(group[group.length - 1]) !== 'else') {
    return false
  }

  return group.every((node) => {
    if (node.type !== NodeTypes.ELEMENT || node.tag === 'template' || node.tag === 'slot') {
      return false
    }
    if (node.tagType === ElementTypes.ELEMENT || ['Teleport', 'TransitionGroup'].includes(node.tag)) {
      return true
    }

    const component = componentByName.get(node.tag)
    return component ? hasTransitionableRoot(component.file, component.content, seen) : true
  })
}

function getUnsafeTransitionChildren(file: string, content: string) {
  const root = parse(content, { filename: file }).descriptor.template?.ast
  const offenders: string[] = []

  function visit(node: RootNode | TemplateChildNode) {
    if (node.type === NodeTypes.ELEMENT) {
      if (['Transition', 'BaseTransition'].includes(node.tag)) {
        const groups = getRootGroupsFromChildren(node.children)
        if (groups.length !== 1) {
          offenders.push(`${relative(appDir, file)}:${node.loc.start.line} -> ${groups.length} root groups`)
        }
        for (const child of getMeaningfulNodes(node.children)) {
          if (child.type !== NodeTypes.ELEMENT || child.tagType !== ElementTypes.COMPONENT) continue
          const component = componentByName.get(child.tag)
          if (component && !hasTransitionableRoot(component.file, component.content)) {
            offenders.push(`${relative(appDir, file)}:${child.loc.start.line} -> ${child.tag}`)
          }
        }
      }
      node.children.forEach(visit)
    } else if (node.type === NodeTypes.ROOT) {
      node.children.forEach(visit)
    }
  }

  if (root) visit(root)
  return offenders
}

function hasHardcodedTransitionDuration(content: string) {
  if (/\bduration-\d+\b/.test(content)) return true

  return [...content.matchAll(/transition(?:-duration)?\s*:[^;}]+/g)].some(([declaration]) =>
    [...declaration.matchAll(/(\d*\.?\d+)(ms|s)\b/g)].some(([, value, unit]) => {
      const milliseconds = Number(value) * (unit === 's' ? 1000 : 1)
      return milliseconds > 1
    }),
  )
}

const allCss = readdirSync(cssDir)
  .filter((file) => file.endsWith('.css'))
  .map((file) => ({ file, content: readCss(file) }))

const NAMED_TRANSITIONS = ['fade', 'loading-fade', 'eapp-page', 'metadata-banner', 'sidebar-menu-loading', 'item-grid']

describe('motion contract', () => {
  it('defines each named transition exactly once across stylesheets', () => {
    for (const name of NAMED_TRANSITIONS) {
      const pattern = new RegExp(`\\.${name}-enter-active\\b`)
      const owners = allCss.filter(({ content }) => pattern.test(content)).map(({ file }) => file)
      expect(owners, `${name} must have exactly one definition site`).toEqual(['transitions.css'])
    }
  })

  it('keeps transitions.css free of transition-all shorthand', () => {
    const transitions = readCss('transitions.css')
    expect(transitions).not.toMatch(/transition:\s*all\b/)
  })

  it('no transition-all in app.config.ts button/card slots', () => {
    const config = readAppFile('app.config.ts')
    expect(config).not.toMatch(/transition-all/)
  })

  it('no transition-all in scoped component styles', () => {
    const vueFiles = getAllVueFiles()
    const offenders = vueFiles.filter(({ content }) => /transition-all/.test(content))
    expect(offenders.map(({ file }) => file)).toEqual([])
  })

  it('uses semantic transition durations in Vue components and app.config.ts', () => {
    const sourceFiles = [
      ...getAllVueFiles(),
      { file: join(appDir, 'app.config.ts'), content: readAppFile('app.config.ts') },
    ]
    const offenders = sourceFiles.filter(({ content }) => hasHardcodedTransitionDuration(content))
    expect(offenders.map(({ file }) => file)).toEqual([])
  })

  it('drives shared transitions with semantic motion tokens', () => {
    const raw = readCss('transitions.css')
    const withoutReduced = raw.slice(0, raw.indexOf('prefers-reduced-motion'))
    const transitions = withoutReduced.replace(/transition:\s*\n\s*/g, 'transition: ')
    const transitionDeclarations = transitions
      .split('\n')
      .filter((line) => /^\s*transition:/.test(line))
    expect(transitionDeclarations.length).toBeGreaterThan(0)
    for (const declaration of transitionDeclarations) {
      expect(declaration).toMatch(/var\(--duration-/)
      expect(declaration).toMatch(/var\(--ease-/)
    }
  })

  it('declares semantic duration and easing tokens in theme.css', () => {
    const theme = readCss('theme.css')
    for (const token of [
      '--duration-instant',
      '--duration-fast',
      '--duration-base',
      '--duration-emphasized',
      '--ease-standard',
      '--ease-enter',
      '--ease-exit',
    ]) {
      expect(theme).toContain(token)
    }
  })

  it('handles prefers-reduced-motion for transitions and decorative animation', () => {
    const transitions = readCss('transitions.css')
    const main = readCss('main.css')
    expect(transitions).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
    expect(main).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  })

  it('removes route translation and list movement under reduced motion', () => {
    const transitions = readCss('transitions.css')
    const reducedBlock = transitions.slice(transitions.indexOf('prefers-reduced-motion'))
    expect(reducedBlock).toMatch(/\.eapp-page-enter-from/)
    expect(reducedBlock).toMatch(/transform:\s*none/)
    expect(reducedBlock).toMatch(/\.item-grid-move/)
  })

  it('does not use position:absolute on eapp-page leave (prevents flex collapse)', () => {
    const transitions = readCss('transitions.css')
    const leaveBlock = transitions.match(/\.eapp-page-leave-active\s*\{[^}]*\}/)?.[0] ?? ''
    expect(leaveBlock).not.toMatch(/position:\s*absolute/)
  })

  it('sequences route leave before enter so pages do not overlap', () => {
    const app = readAppFile('app.vue')
    expect(app).toContain(`:transition="{ name: 'eapp-page', mode: 'out-in' }"`)
  })

  it('keeps every Nuxt page on a transitionable element root', () => {
    const offenders = pageFiles
      .filter(({ file, content }) => !hasTransitionableRoot(file, content))
      .map(({ file }) => relative(pageDir, file))
    expect(offenders).toEqual([])
  })

  it('keeps local component children of Transition on an element root', () => {
    const offenders = getAllVueFiles().flatMap(({ file, content }) =>
      getUnsafeTransitionChildren(file, content),
    )
    expect(offenders).toEqual([])
  })

  it('contains transition grid stacks so wide tables cannot expand the workspace', () => {
    const layout = readAppFile('layouts/default.vue')
    const dynamicPage = readAppFile('components/dynamic/PageComponent.vue')

    expect(layout).toMatch(/\.route-stack\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s)
    expect(layout).toMatch(/\.route-stack\s*>\s*\*\s*\{[^}]*min-width:\s*0/s)
    expect(dynamicPage).toMatch(/\.dynamic-page-stack\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s)
    expect(dynamicPage).toMatch(/\.dynamic-page-stack\s*>\s*\*\s*\{[^}]*min-width:\s*0/s)
  })
})
