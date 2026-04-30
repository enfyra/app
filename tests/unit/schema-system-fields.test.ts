import {
  isCreateRecordSystemField,
  isRecordPrimaryKeyField,
} from '~/utils/schema/system-fields'

describe('schema system fields', () => {
  it('treats both SQL and Mongo primary key conventions as record ids', () => {
    expect(isRecordPrimaryKeyField('id')).toBe(true)
    expect(isRecordPrimaryKeyField('_id')).toBe(true)
    expect(isRecordPrimaryKeyField('name')).toBe(false)
  })

  it('excludes record ids from create forms independent of database context', () => {
    expect(isCreateRecordSystemField('id')).toBe(true)
    expect(isCreateRecordSystemField('_id')).toBe(true)
    expect(isCreateRecordSystemField('createdAt')).toBe(true)
    expect(isCreateRecordSystemField('updatedAt')).toBe(true)
    expect(isCreateRecordSystemField('email')).toBe(false)
  })
})
