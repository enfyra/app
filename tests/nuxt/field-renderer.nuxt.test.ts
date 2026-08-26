import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'

import FieldRenderer from '~/components/form/FieldRenderer.vue'

describe('FieldRenderer', () => {
  it('renders float columns as numeric inputs', async () => {
    const wrapper = await mountSuspended(FieldRenderer, {
      route: '/collections/products',
      props: {
        keyName: 'price',
        formData: { price: 12.5 },
        columnMap: new Map([
          ['price', { name: 'price', fieldType: 'column', type: 'float' }],
        ]),
        errors: {},
      },
    })

    const input = wrapper.get('input')
    expect(input.attributes('type')).toBe('number')
    expect(input.element.value).toBe('12.5')
  })
})
