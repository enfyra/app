import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import DataTable from '~/components/data-table/DataTable.vue'

describe('DataTable layout', () => {
  it('keeps identifier columns compact and ellipsized on desktop tables', async () => {
    const wrapper = await mountSuspended(DataTable, {
      route: '/data/cloud_email_senders',
      props: {
        data: [
          { id: 2, email: 'no-reply@enfyra.io', name: 'Enfyra Cloud' },
          { id: 1, email: 'support@enfyra.io', name: 'Enfyra Support' },
        ],
        columns: [
          {
            id: 'id',
            accessorKey: 'id',
            header: 'id',
            size: 84,
            minSize: 84,
            maxSize: 220,
          },
          { id: 'email', accessorKey: 'email', header: 'email' },
          { id: 'name', accessorKey: 'name', header: 'name' },
        ],
      },
    })

    await nextTick()
    await flushPromises()
    await nextTick()

    const table = wrapper.get('table')
    expect(table.classes()).toContain('table-fixed')
    expect(table.classes()).toContain('w-max')
    expect(table.classes()).not.toContain('w-full')
    expect(table.classes()).not.toContain('min-w-full')

    const idCol = wrapper.get('colgroup col:first-child')
    expect(idCol.attributes('style')).toContain('width: 84px')
    expect(idCol.attributes('style')).toContain('max-width: 220px')

    const idHeader = wrapper.get('thead th:first-child')
    expect(idHeader.attributes('style')).toContain('width: 84px')

    const idCell = wrapper.get('tbody tr:first-child td:first-child')
    expect(idCell.attributes('style')).toContain('width: 84px')
    expect(idCell.classes()).toEqual(
      expect.arrayContaining(['overflow-hidden', 'whitespace-nowrap', 'text-ellipsis']),
    )

    const idText = idCell.get('p')
    expect(idText.classes()).toEqual(expect.arrayContaining(['font-mono', 'truncate']))
  })
})
