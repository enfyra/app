export function useDataTableSlots() {
  const slots = useSlots()
  const cellSlotNames = computed(() => Object.keys(slots).filter((name): name is `${string}-cell` => name.endsWith('-cell')))
  const columnSlotNames = computed(() => Object.keys(slots).filter((name): name is `${string}-header` | `${string}-footer` => name.endsWith('-header') || name.endsWith('-footer')))
  const contentSlotNames = computed(() => Object.keys(slots).filter((name): name is 'loading' | 'empty' | 'caption' | 'body-top' | 'body-bottom' => ['loading', 'empty', 'caption', 'body-top', 'body-bottom'].includes(name)))
  return { cellSlotNames, columnSlotNames, contentSlotNames }
}
