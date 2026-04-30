import { describe, expect, it } from 'vitest'
import {
  isMongoPrimaryKeyColumn,
  normalizeMongoPrimaryKeyColumn,
} from '../../app/utils/schema/mongo-primary-key'

describe('mongo primary key schema helpers', () => {
  it('recognizes legacy and canonical Mongo primary key metadata', () => {
    expect(isMongoPrimaryKeyColumn({ name: 'id', isPrimary: true })).toBe(true)
    expect(isMongoPrimaryKeyColumn({ name: '_id', isPrimary: true })).toBe(true)
    expect(isMongoPrimaryKeyColumn({ name: '_id', isPrimary: false })).toBe(false)
    expect(isMongoPrimaryKeyColumn({ name: 'slug', isPrimary: true })).toBe(false)
  })

  it('normalizes Mongo primary key metadata to _id ObjectId', () => {
    expect(
      normalizeMongoPrimaryKeyColumn({
        name: 'id',
        type: 'uuid',
        isPrimary: true,
        label: 'Primary key',
      }),
    ).toEqual({
      name: '_id',
      type: 'ObjectId',
      isPrimary: true,
      label: 'Primary key',
    })
  })
})
