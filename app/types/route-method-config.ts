export interface RouteMethodFileFieldDraft {
  id?: string | number
  name: string
  required: boolean
  maxCount: number
  maxFileSize: number | null
  allowedMimeTypes: string[] | null
  sort: number
}

export interface RouteMethodConfigFormOptions {
  readonly: boolean
  available: boolean
  isPublic: boolean
  multipartAllowed: boolean
}

export interface RouteMethodAvailabilityOptions {
  canUpdate: () => boolean
  isSaving: () => boolean
  refresh: () => Promise<unknown>
}
