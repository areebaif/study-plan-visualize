export interface ErrorInterface {
  message: string;
  field?: string;
}

export interface AuthDbRow {
  id: string;
  email: string;
}

export interface AuthApiReturnData {
  data?: AuthDbRow | null | undefined;
  currentUser?: AuthDbRow | null;
  errors?: Error[];
}
