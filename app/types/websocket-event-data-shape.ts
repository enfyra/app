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

export type WebsocketNativeActionType =
  | 'joinRoom'
  | 'leaveRoom'
  | 'emitToRoom'
  | 'emitToUser'
  | 'reply'
  | 'broadcast'
  | 'disconnect';

export interface WebsocketNativeActionConfig {
  action?: WebsocketNativeActionType;
  type?: WebsocketNativeActionType;
  event?: string;
  eventName?: string;
  room?: string;
  roomTemplate?: string;
  userId?: string;
  userTemplate?: string;
  payload?: any;
  payloadExpression?: any;
}

export interface WebsocketNativeFlowTriggerConfig {
  flowId?: string | number;
  flowName?: string;
  flow?: string | number;
  payload?: any;
  payloadExpression?: any;
}
