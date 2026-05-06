export type WebsocketEventDataShapeType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'object'
  | 'array'
  | 'any';

export interface WebsocketEventDataShapeField {
  id: string;
  name: string;
  type: WebsocketEventDataShapeType;
  required: boolean;
  children?: WebsocketEventDataShapeField[];
  itemType?: Exclude<WebsocketEventDataShapeType, 'array'>;
}

export interface WebsocketEventDataShapeToken {
  label: string;
  value: string;
  type: WebsocketEventDataShapeType | 'array-item';
}
