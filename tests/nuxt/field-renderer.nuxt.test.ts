import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'

import FieldRenderer from '~/components/form/FieldRenderer.vue'

describe('FieldRenderer', () => {
  it('keeps signed int64 input as exact decimal text', async () => {
    const wrapper = await mountSuspended(FieldRenderer, { props: {
      keyName: 'amount', formData: { amount: '9007199254740993' },
      columnMap: new Map([['amount', { name: 'amount', fieldType: 'column', type: 'long' }]]), errors: {},
    } });
    try {
      const input = wrapper.get('input');
      expect(input.attributes('type')).toBe('text');
      await input.setValue('9223372036854775807');
      expect(wrapper.emitted('update:formData')?.at(-1)).toEqual(['amount', '9223372036854775807']);
    } finally { wrapper.unmount(); }
  });
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
