export interface ErrorInterface {
  message: string;
  field?: string;
}

export interface AuthDbRow {
  id: string;
  email: string;
}

export interface AuthApiReturnData {
  currentUser?: AuthDbRow | null | undefined;
  errors?: Error[];
}
