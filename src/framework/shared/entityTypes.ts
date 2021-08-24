export type EntityID = number;

export type ClientEntity = Record<string, any> & { type: string };

export type ClientState = Map<EntityID, ClientEntity>;
