/**
 * Type declaration file for api-client.js
 */

// UserApi interface
export interface UserApi {
  getAll: () => Promise<UserData[]>;
  getById: (id: string) => Promise<UserData>;
  create: (userData: UserInput) => Promise<UserData>;
  update: (id: string, userData: Partial<UserInput>) => Promise<UserData>;
  delete: (id: string) => Promise<any>;
}

// DocumentApi interface
export interface DocumentApi {
  getAll: () => Promise<DocumentData[]>;
  getById: (id: string) => Promise<DocumentData>;
  create: (documentData: DocumentInput) => Promise<DocumentData>;
  update: (id: string, documentData: Partial<DocumentInput>) => Promise<DocumentData>;
  delete: (id: string) => Promise<any>;
}

// Data types
export interface UserData {
  _id?: string;
  id?: string;
  email: string;
  username: string;
  fullName: string;
  [key: string]: any;
}

export interface UserInput {
  email: string;
  username: string;
  fullName: string;
  [key: string]: any;
}

export interface DocumentData {
  _id?: string;
  id?: string;
  title: string;
  content: string;
  [key: string]: any;
}

export interface DocumentInput {
  title: string;
  content: string;
  [key: string]: any;
}

// Function to check API connection
export function checkApiConnection(): Promise<{
  status: string;
  timestamp: string;
  version: string;
}>;

// Default export
declare const _default: {
  UserApi: UserApi;
  DocumentApi: DocumentApi;
  checkApiConnection: typeof checkApiConnection;
};

export default _default;
